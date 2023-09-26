import {
    ActionHashB64,
    AgentPubKeyB64,
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
export interface FileSharePerspective {
    ///** AgentPubKey -> manifest_eh */
    //privateFilesReceivedByAgent: Record<AgentPubKeyB64, EntryHashB64[]>,
    /** manifest_eh -> Manifest */
    privateFiles: Record<EntryHashB64, ParcelManifest>,
    /** manifest_eh -> Manifest */
    localPublicFiles: Record<EntryHashB64, ParcelManifest>,
}



/** */
export class FileShareZvm extends ZomeViewModel {

    static readonly ZOME_PROXY = FileShareProxy;

    private _allAppletIds: EntryHashB64[] = [];

    //private _worker = new Worker("./commitPrivateFile.ts");

    get zomeProxy(): FileShareProxy {
        return this._zomeProxy as FileShareProxy;
    }


    /** -- ViewModel -- */

    private _perspective: FileSharePerspective = {/*privateFilesReceivedByAgent: {},*/ privateFiles: {}, localPublicFiles: {}};


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
    async initializePerspectiveOnline(): Promise<void> {
        // FIXME
    }


    /** */
    async initializePerspectiveOffline(): Promise<void> {
        await this.getPrivateFiles();
        await this.getLocalPublicFiles();

        //console.log("Can worker", window.Worker);
        // this._worker.onmessage = (event) => {
        //     console.log('Worker said: ' + event.data);
        //     //this._perspective.privateFiles[event.data.ehb64] = event.data.manifest;
        //     this.notifySubscribers();
        // };
        // console.log("worker", this._worker);
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


    // /** */
    // commitPrivateFile(file: File, splitObj: SplitObject): void {
    //     console.log('zvm.commitPrivateFile: ', splitObj);
    //     this._worker.postMessage({file, splitObj, zomeProxy: this.zomeProxy});
    // }


    /** */
    // async commitPrivateChunk(dataHash: string, data: string): Promise<EntryHashB64> {
    //     const eh = await this.zomeProxy.writeFileChunk({data_hash: dataHash, data});
    //     return encodeHashToBase64(eh);
    // }


    /** */
    async commitPrivateManifest(file: File, dataHash: string, chunks: EntryHash[]): Promise<EntryHashB64> {
        const params = {
            filename: file.name,
            filetype: file.type,
            data_hash: dataHash,
            orig_filesize: file.size,
            chunks,
        }
        const [manifest_eh, description] =  await this.zomeProxy.commitPrivateFile(params);
        const ehb64 = encodeHashToBase64(manifest_eh);
        /** Store new manifest */
        this._perspective.privateFiles[ehb64] = {
            data_hash: dataHash,
            chunks,
            description,
        } as ParcelManifest;
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
        const [manifest_eh, description] =  await this.zomeProxy.publishFileManifest(params);
        const ehb64 = encodeHashToBase64(manifest_eh);
        /** Store new manifest */
        this._perspective.localPublicFiles[ehb64] = {
            data_hash: dataHash,
            chunks,
            description,
        } as ParcelManifest;
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
      const [manifest_eh, description] =  await this.zomeProxy.commitPrivateFile(params);
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
