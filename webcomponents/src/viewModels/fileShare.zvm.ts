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
import {arrayBufferToBase64, splitFile} from "../utils";
import {FileShareProxy} from "../bindings/file_share.proxy";
import {FILE_TYPE_NAME, SendFileInput} from "../bindings/file_share.types";
import {DistributionStrategyType} from "../bindings/deps.types";
import {ParcelManifest} from "@ddd-qc/delivery";


/** */
export interface FileSharePerspective {
    /** AgentPubKey -> manifest_eh */
    filesReceivedByAgent: Record<AgentPubKeyB64, EntryHashB64[]>,
    /** manifest_eh -> Manifest */
    localFiles: Record<EntryHashB64, ParcelManifest>,
    /** AgentPubKey -> notice_eh */
    inboundRequests: Record<AgentPubKeyB64, EntryHashB64>,
}



/** */
export class FileShareZvm extends ZomeViewModel {

    static readonly ZOME_PROXY = FileShareProxy;

    private _allAppletIds: EntryHashB64[] = [];

    get zomeProxy(): FileShareProxy {
        return this._zomeProxy as FileShareProxy;
    }


    /** -- ViewModel -- */

    private _perspective: FileSharePerspective = {filesReceivedByAgent: {}, localFiles: {}, inboundRequests: {}};


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


    async getFile(eh: EntryHashB64): Promise<[ParcelManifest, string]> {
        return this.zomeProxy.getFile(decodeHashFromBase64(eh));
    }


    /** */
    async writeManifest(
        //dataHash: string,
        filename: string,
        filetype: string,
        orig_filesize: number,
        chunks: EntryHash[]): Promise<EntryHash> {
        const params = {
            //data_hash: dataHash,
            filename,
            filetype,
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


    async commitFile(file: File): Promise<EntryHashB64> {
        console.log('commitFile: ', file)

        // /** Causes stack error on big files */
        // if (!base64regex.test(file.content)) {
        //   const invalid_hash = sha256(file.content);
        //   console.error("File '" + file.name + "' is invalid base64. hash is: " + invalid_hash);
        // }

        const content = await file.arrayBuffer();
        const contentB64 = arrayBufferToBase64(content);

        const splitObj = await splitFile(contentB64);
        console.log({splitObj})

        /** Commit each chunk */
        const chunksToSend: EntryHash[] = [];
        for (let i = 0; i < splitObj.numChunks; ++i) {
            const eh = await this.zomeProxy.writeChunk(/*splitObj.dataHash, i,*/ splitObj.chunks[i]);
            chunksToSend.push(eh);
        }
        const manifest_eh = await this.writeManifest(/*splitObj.dataHash,*/ file.name, file.type, file.size, chunksToSend);
        const ehb64 = encodeHashToBase64(manifest_eh);

        this._perspective.localFiles[ehb64] = {
            name: file.name,
            custum_entry_type: FILE_TYPE_NAME,
            size: file.size,
            chunks: chunksToSend,
        } as ParcelManifest;

        this.notifySubscribers();

        return ehb64;
    }


    /** */
    async sendFile(manifest_eh: EntryHashB64, recipient: AgentPubKeyB64): Promise<EntryHashB64> {
        const input: SendFileInput = {
            manifest_eh: decodeHashFromBase64(manifest_eh),
            strategy: { NORMAL: null },
            recipients: [decodeHashFromBase64(recipient)],
        };
        console.log('sending file:', input);
        /* Send Mail */
        /*const outmail_hh =*/
        const eh = await this.zomeProxy.sendFile(input);
        return encodeHashToBase64(eh)
    }
}
