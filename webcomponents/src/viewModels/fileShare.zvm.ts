import {
    ActionHash, ActionHashB64,
    AgentPubKey, AgentPubKeyB64,
    AnyDhtHash, AppSignalCb,
    decodeHashFromBase64,
    encodeHashToBase64,
    EntryHash, EntryHashB64
} from '@holochain/client';
import {AppSignal} from "@holochain/client/lib/api/app/types";
import {ZomeViewModel} from "@ddd-qc/lit-happ";
import {arrayBufferToBase64, splitData, SplitObject} from "../utils";
import {FileShareProxy} from "../bindings/file_share.proxy";
import {FILE_TYPE_NAME, SendFileInput} from "../bindings/file_share.types";
import {ParcelManifest} from "@ddd-qc/delivery";


/** */
export interface FileSharePerspective {
    /** AgentPubKey -> manifest_eh */
    privateFilesReceivedByAgent: Record<AgentPubKeyB64, EntryHashB64[]>,
    /** manifest_eh -> Manifest */
    privateFiles: Record<EntryHashB64, ParcelManifest>,
    /** manifest_eh -> Manifest */
    localPublicFiles: Record<EntryHashB64, ParcelManifest>,
}



/** */
export class FileShareZvm extends ZomeViewModel {

    static readonly ZOME_PROXY = FileShareProxy;

    private _allAppletIds: EntryHashB64[] = [];

    get zomeProxy(): FileShareProxy {
        return this._zomeProxy as FileShareProxy;
    }


    /** -- ViewModel -- */

    private _perspective: FileSharePerspective = {privateFilesReceivedByAgent: {}, privateFiles: {}, localPublicFiles: {}};


    /* */
    get perspective(): FileSharePerspective {
        return this._perspective;
    }


    /* */
    protected hasChanged(): boolean {
        // TODO
        return true;
    }


    /** */
    async initializePerspectiveOffline(): Promise<void> {
        await this.getPrivateFiles();
        await this.getLocalPublicFiles();
    }


    // async probeAll(): Promise<void> {
    //     const prs  = await this.zomeProxy.probeFiles();
    //     console.log("fileShare.zvm.probeAll()", prs);
    // }


    /** */
    async getPrivateFiles(): Promise<void> {
        const pairs = await this.zomeProxy.getPrivateFiles();
        for (const [eh, manifest] of pairs) {
            this._perspective.privateFiles[encodeHashToBase64(eh)] = manifest;
        }
        this.notifySubscribers();
    }


    /** */
    async getLocalPublicFiles(): Promise<void> {
        const pairs = await this.zomeProxy.getLocalPublicFiles();
        for (const [eh, manifest] of pairs) {
            this._perspective.localPublicFiles[encodeHashToBase64(eh)] = manifest;
        }
        this.notifySubscribers();
    }

    /** */
    async initializePerspectiveOnline(): Promise<void> {
        // FIXME
    }


    // /** */
    // async writeChunk(chunk: string): Promise<EntryHash> {
    //     return this.zomeProxy.writeChunk(chunk);
    // }

    // /** */
    // async writeChunk(dataHash: string, chunkIndex: number, chunk: string): Promise<EntryHash> {
    //     const params = {
    //         data_hash: dataHash,
    //         chunk_index: chunkIndex,
    //         chunk
    //     }
    //     return this.zomeProxy.writeChunk(params);
    // }


    /** */
    async commitPrivateFile(file: File, splitObj: SplitObject): Promise<EntryHashB64> {
        console.log('zvm.commitPrivateFile: ', splitObj)
        /** Commit each chunk */
        const chunksToSend: EntryHash[] = [];
        for (let i = 0; i < splitObj.numChunks; ++i) {
            const eh = await this.zomeProxy.writeChunk(/*splitObj.dataHash, i,*/ splitObj.chunks[i]);
            chunksToSend.push(eh);
        }
        /** Commit file manifest */
        const params = {
            filename: file.name,
            filetype: file.type,
            data_hash: splitObj.dataHash,
            orig_filesize: file.size,
            chunks: chunksToSend,
        }
        const [manifest_eh, description] = await this.zomeProxy.commitPrivateFile(params);
        const ehb64 = encodeHashToBase64(manifest_eh);
        /** Store new manifest */
        this._perspective.privateFiles[ehb64] = {
            data_hash: splitObj.dataHash,
            chunks: chunksToSend,
            description,
        } as ParcelManifest;
        /** Done */
        this.notifySubscribers();
        return ehb64;
    }


    /** */
    async publishFile(file: File, splitObj: SplitObject): Promise<EntryHashB64> {
        console.log('zvm.commitPublicFile: ', splitObj)
        /** Commit each chunk */
        const chunksToSend: EntryHash[] = [];
        for (let i = 0; i < splitObj.numChunks; ++i) {
            const eh = await this.zomeProxy.writePublicChunk(/*splitObj.dataHash, i,*/ splitObj.chunks[i]);
            chunksToSend.push(eh);
        }
        /** Commit file manifest */
        const params = {
            filename: file.name,
            filetype: file.type,
            data_hash: splitObj.dataHash,
            orig_filesize: file.size,
            chunks: chunksToSend,
        }
        const [manifest_eh, description] = await this.zomeProxy.publishFileManifest(params);
        const ehb64 = encodeHashToBase64(manifest_eh);
        /** Store new manifest */
        this._perspective.localPublicFiles[ehb64] = {
            data_hash: splitObj.dataHash,
            chunks: chunksToSend,
            description,
        } as ParcelManifest;
        /** Done */
        this.notifySubscribers();
        return ehb64;
    }


    /** */
    async sendFile(manifest_eh: EntryHashB64, recipient: AgentPubKeyB64): Promise<ActionHashB64> {
        const input: SendFileInput = {
            manifest_eh: decodeHashFromBase64(manifest_eh),
            strategy: { NORMAL: null },
            recipients: [decodeHashFromBase64(recipient)],
        };
        console.log('sending file:', input);
        /* Send File */
        const ah = await this.zomeProxy.sendFile(input);
        return encodeHashToBase64(ah);
    }
}
