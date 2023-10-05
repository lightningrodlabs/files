import {
    ActionHashB64,
    AgentPubKeyB64, AppSignalCb,
    decodeHashFromBase64,
    encodeHashToBase64,
    EntryHash, EntryHashB64
} from '@holochain/client';
import {delay, ZomeViewModel} from "@ddd-qc/lit-happ";
import {SplitObject} from "../utils";
import {FileShareProxy} from "../bindings/file_share.proxy";
import {SendFileInput} from "../bindings/file_share.types";
import {ParcelManifest} from "@ddd-qc/delivery";

//import WebWorker from 'web-worker:./commitPrivateFile.ts';


/** */
export class FileShareZvm extends ZomeViewModel {

    static readonly ZOME_PROXY = FileShareProxy;

    private _allAppletIds: EntryHashB64[] = [];

    //private _worker = new Worker("./commitPrivateFile.ts");

    get zomeProxy(): FileShareProxy {
        return this._zomeProxy as FileShareProxy;
    }


    /** -- ViewModel -- */


    /* */
    get perspective(): unknown {
        return {};
    }


    /* */
    protected hasChanged(): boolean {
        // TODO
        return true;
    }


    /** */
    async initializePerspectiveOnline(): Promise<void> {
        // N/A
    }


    /** */
    async initializePerspectiveOffline(): Promise<void> {
        // N/A
    }




    // /** -- Signals -- */
    //
    // signalHandler?: AppSignalCb = this.mySignalHandler;
    //
    // /** */
    // mySignalHandler(signal: AppSignal): void {
    //
    // }


    /** -- Methods -- */


    /** */
    async commitPrivateManifest(file: File, dataHash: string, chunks: EntryHash[]): Promise<EntryHashB64> {
        const params = {
            filename: file.name,
            filetype: file.type,
            data_hash: dataHash,
            orig_filesize: file.size,
            chunks,
        }
        const [manifest_eh, _description] =  await this.zomeProxy.commitPrivateFile(params);
        const ehb64 = encodeHashToBase64(manifest_eh);
        /** Done */
        this.notifySubscribers();
        return ehb64;
    }


    /** */
    async publishFileManifest(file: File, dataHash: string, chunks: EntryHash[]): Promise<EntryHashB64> {
        const params = {
            filename: file.name,
            filetype: file.type,
            data_hash: dataHash,
            orig_filesize: file.size,
            chunks,
        }
        const [manifest_eh, _description] =  await this.zomeProxy.publishFileManifest(params);
        const ehb64 = encodeHashToBase64(manifest_eh);
        /** Store new manifest */
        /** Done */
        this.notifySubscribers();
        return ehb64;
    }


    /** */
    async commitPrivateFile(file: File, splitObj: SplitObject): Promise<EntryHashB64> {
      /** Commit each chunk */
      const chunksToSend: EntryHash[] = [];
      for (let i = 0; i < splitObj.numChunks; ++i) {
        const eh = await this.zomeProxy.writePrivateFileChunk({data_hash: splitObj.dataHash, data: splitObj.chunks[i]});
        chunksToSend.push(eh);
        //await delay(splitObj.numChunks);
        await delay(40);
      }
      /** Commit file manifest */
      const params = {
        filename: file.name,
        filetype: file.type,
        data_hash: splitObj.dataHash,
        orig_filesize: file.size,
        chunks: chunksToSend,
      }
      const [manifest_eh, _description] =  await this.zomeProxy.commitPrivateFile(params);
      const ehb64 = encodeHashToBase64(manifest_eh);
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
            const eh = await this.zomeProxy.writePublicFileChunk({data_hash: splitObj.dataHash, data: splitObj.chunks[i]});
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
        const [manifest_eh, _description] = await this.zomeProxy.publishFileManifest(params);
        const ehb64 = encodeHashToBase64(manifest_eh);
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
