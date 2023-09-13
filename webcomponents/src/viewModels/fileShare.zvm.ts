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
import {arrayBufferToBase64, splitFile, SplitObject} from "../utils";
import {FileShareProxy} from "../bindings/file_share.proxy";
import {FILE_TYPE_NAME, SendFileInput} from "../bindings/file_share.types";
import {ParcelManifest} from "@ddd-qc/delivery";


/** */
export interface FileSharePerspective {
    /** AgentPubKey -> manifest_eh */
    filesReceivedByAgent: Record<AgentPubKeyB64, EntryHashB64[]>,
    /** manifest_eh -> Manifest */
    localFiles: Record<EntryHashB64, ParcelManifest>,
}



/** */
export class FileShareZvm extends ZomeViewModel {

    static readonly ZOME_PROXY = FileShareProxy;

    private _allAppletIds: EntryHashB64[] = [];

    get zomeProxy(): FileShareProxy {
        return this._zomeProxy as FileShareProxy;
    }


    /** -- ViewModel -- */

    private _perspective: FileSharePerspective = {filesReceivedByAgent: {}, localFiles: {}};


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
        await this.getLocalFiles();
    }



    /** */
    async getLocalFiles(): Promise<void> {
        const pairs = await this.zomeProxy.getLocalFiles();
        for (const [eh, manifest] of pairs) {
            this._perspective.localFiles[encodeHashToBase64(eh)] = manifest;
        }
        this.notifySubscribers();
    }

    /** */
    async initializePerspectiveOnline(): Promise<void> {
        // FIXME
    }


    /** */
    async getFile(eh: EntryHashB64): Promise<[ParcelManifest, string]> {
        return this.zomeProxy.getFile(decodeHashFromBase64(eh));
    }


    /** */
    async writeManifest(
        //dataHash: string,
        filename: string,
        filetype: string,
        data_hash: string,
        orig_filesize: number,
        chunks: EntryHash[]): Promise<EntryHash> {
        const params = {
            //data_hash: dataHash,
            filename,
            filetype,
            data_hash,
            orig_filesize,
            chunks
        }
        return this.zomeProxy.commitFileManifest(params);
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


    async commitFile(file: File, splitObj: SplitObject): Promise<EntryHashB64> {
        console.log('zvm.commitFile: ', splitObj)

        /** Commit each chunk */
        const chunksToSend: EntryHash[] = [];
        for (let i = 0; i < splitObj.numChunks; ++i) {
            const eh = await this.zomeProxy.writeChunk(/*splitObj.dataHash, i,*/ splitObj.chunks[i]);
            chunksToSend.push(eh);
        }
        const manifest_eh = await this.writeManifest(file.name, file.type, splitObj.dataHash, file.size, chunksToSend);
        const ehb64 = encodeHashToBase64(manifest_eh);

        this._perspective.localFiles[ehb64] = {
            name: file.name,
            data_type: FILE_TYPE_NAME,
            size: file.size,
            chunks: chunksToSend,
        } as ParcelManifest;

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
        /* Send Mail */
        /*const outmail_hh =*/
        const ah = await this.zomeProxy.sendFile(input);
        return encodeHashToBase64(ah)
    }
}
