import {
    ActionHash, ActionHashB64,
    AgentPubKey, AgentPubKeyB64,
    AnyDhtHash, AppSignalCb,
    decodeHashFromBase64,
    encodeHashToBase64,
    EntryHash
} from '@holochain/client';
import {AppSignal} from "@holochain/client/lib/api/app/types";
import {ZomeViewModel} from "@ddd-qc/lit-happ";
import {arrayBufferToBase64, splitFile} from "../utils";
import {FileShareProxy} from "../bindings/file_share.proxy";
import {SendFileInput} from "../bindings/file_share.types";
import {DistributionStrategyType} from "../bindings/deps.types";


/** */
export class SnapmailZvm extends ZomeViewModel {

    static readonly ZOME_PROXY = FileShareProxy;

    get zomeProxy(): FileShareProxy {
        return this._zomeProxy as FileShareProxy;
    }


    /** -- ViewModel -- */

    private _perspective: unknown = {};


    /* */
    get perspective(): unknown {
        return this._perspective;
    }


    /* */
    protected hasChanged(): boolean {
        // TODO
        return true;
    }


    async initializePerspectiveOnline(): Promise<void> {
        // FIXME
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


    /** */
    async sendFiles(files: /*UploadFile*/any[], recipients: AgentPubKey[]): Promise<void> {
        /** Commit & send each File */
        for (const file of files) {
            // /** Causes stack error on big files */
            // if (!base64regex.test(file.content)) {
            //   const invalid_hash = sha256(file.content);
            //   console.error("File '" + file.name + "' is invalid base64. hash is: " + invalid_hash);
            // }
            console.log('sendAction: ', file)
            const content = await file.arrayBuffer();
            const contentB64 = arrayBufferToBase64(content);

            const filetype = "unknown" // FIXME
            const splitObj = await splitFile(contentB64);
            console.log({splitObj})


            /** Commit each chunk */
            const chunksToSend: EntryHash[] = [];
            for (let i = 0; i < splitObj.numChunks; ++i) {
                const eh = await this.zomeProxy.writeChunk(/*splitObj.dataHash, i,*/ splitObj.chunks[i]);
                chunksToSend.push(eh);
            }
            const manifest_eh = await this.writeManifest(/*splitObj.dataHash,*/ file.name, filetype, file.size, chunksToSend);

            /* Create Mail */
            const input: SendFileInput = {
                manifest_eh,
                strategy: { NORMAL: null },
                recipients,
            };
            console.log('sending file:', input);
            /* Send Mail */
            /*const outmail_hh =*/
            await this.zomeProxy.sendFile(input);
        }
    }
}
