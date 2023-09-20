import { DnaViewModel, ZvmDef } from "@ddd-qc/lit-happ";
import {
    DeliveryProperties,
    DeliveryState,
    DeliveryStateType,
    DeliveryZvm,
    DistributionStateType, ParcelDescription, ParcelManifest,
    SignalProtocol,
    SignalProtocolType
} from "@ddd-qc/delivery";
import {
    AgentPubKeyB64,
    AppSignalCb,
    decodeHashFromBase64,
    encodeHashToBase64,
    EntryHash,
    EntryHashB64,
    Timestamp
} from "@holochain/client";
import {AppSignal} from "@holochain/client/lib/api/app/types";

import {FileSharePerspective, FileShareZvm} from "./fileShare.zvm";
import {arrayBufferToBase64, splitData, splitFile, SplitObject} from "../utils";
import { decode } from "@msgpack/msgpack";
import {Dictionary} from "@ddd-qc/cell-proxy";


/** */
export interface FileShareDvmPerspective {
    /* DataHash -> pp_eh */
    publicFiles: Record<string, EntryHashB64>,
}


/**
 *
 */
export class FileShareDvm extends DnaViewModel {

    /** -- DnaViewModel Interface -- */

    static readonly DEFAULT_BASE_ROLE_NAME = "rFileShare";
    static readonly ZVM_DEFS: ZvmDef[] = [
        FileShareZvm,
        [DeliveryZvm, "zDelivery"],
    ];

    readonly signalHandler?: AppSignalCb = this.mySignalHandler;


    /** QoL Helpers */
    get fileShareZvm(): FileShareZvm {return this.getZomeViewModel(FileShareZvm.DEFAULT_ZOME_NAME) as FileShareZvm}
    get deliveryZvm(): DeliveryZvm {return this.getZomeViewModel("zDelivery") as DeliveryZvm}


    /** -- ViewModel Interface -- */

    private _perspective: FileShareDvmPerspective = {publicFiles: {}};


    /** */
    protected hasChanged(): boolean {
        return true;
        // //console.log("fileShareDvm.hasChanged()");
        // if (!this._previousPerspective) {
        //     return true;
        // }
        // const prev = this._previousPerspective as FileShareDvmPerspective;
        // if (Object.values(this._perspective.unrepliedOutbounds).length != Object.values(prev.unrepliedOutbounds).length) {
        //     return true;
        // }
        // if (Object.values(this._perspective.unrepliedInbounds).length != Object.values(prev.unrepliedInbounds).length) {
        //     return true;
        // }
        // // TODO implement faster deep compare
        // return JSON.stringify(this._perspective) == JSON.stringify(prev);
        // //return false;
    }


    /** */
    get perspective(): FileShareDvmPerspective { return this._perspective }
    //get perspective(): unknown { return {} }


    get dnaProperties(): DeliveryProperties {
        const properties = decode(this.cell.dnaModifiers.properties as Uint8Array) as DeliveryProperties;
        //console.log('properties', properties);
        return properties;
    }

    /** -- Methods -- */

    /** */
    mySignalHandler(signal: AppSignal): void {
        console.log("FileShareDvm received signal", signal);
        const deliverySignal = signal.payload as SignalProtocol;
        if (SignalProtocolType.NewChunk in deliverySignal) {
            console.log("signal NewChunk", deliverySignal.NewChunk);
            const chunk = deliverySignal.NewChunk[1];
            const manifestPair = this.deliveryZvm.perspective.localManifestByData[chunk.data_hash];
            if (!manifestPair) {
                /** We are the original creator of this file */
                this._curChunks.push(deliverySignal.NewChunk[0]);
                const index = this._curChunks.length;
                /** Commit manifest if it was the last chunk */
                if (this._curChunks.length == this._curSplitObj.numChunks) {
                    if (this._curIsPrivate) {
                        this.fileShareZvm.commitPrivateManifest(this._curFile, this._curSplitObj.dataHash, this._curChunks).then((_eh) => {
                            this._curChunks = [];
                            this._curSplitObj = undefined;
                            this._curFile = undefined;
                            this._curIsPrivate = undefined;
                        });
                    } else {
                        this.fileShareZvm.publishFileManifest(this._curFile, this._curSplitObj.dataHash, this._curChunks).then((_eh) => {
                            this._curChunks = [];
                            this._curSplitObj = undefined;
                            this._curFile = undefined;
                            this._curIsPrivate = undefined;
                        });
                    }
                } else {
                    /** Otherwise commit next one */
                    this.fileShareZvm.zomeProxy.writePrivateFileChunk({data_hash: this._curSplitObj.dataHash, data: this._curSplitObj.chunks[index]});
                }
            }
        }
        if (SignalProtocolType.NewReceptionProof in deliverySignal) {
            console.log("signal NewReceptionProof", deliverySignal.NewReceptionProof);
            this.fileShareZvm.getPrivateFiles();
        }
        // if (SignalProtocolType.NewPublicParcel in deliverySignal) {
        //     console.log("signal NewPublicParcel", deliverySignal.NewPublicParcel);
        //     const ppEh = encodeHashToBase64(deliverySignal.NewPublicParcel.eh);
        //     this.deliveryZvm.zomeProxy.getManifest(decodeHashFromBase64(ppEh)).then((manifest: ParcelManifest) => {
        //         this._perspective.publicFiles[manifest.data_hash] = ppEh;
        //         this.notifySubscribers();
        //     })
        // }
    }


    /** */
    async probePublicFiles(): Promise<Dictionary<string>> {
        let publicFiles: Dictionary<string> = {};
        const pds = Object.entries(this.deliveryZvm.perspective.publicParcels);
        console.log("probePublicFiles() PublicParcels count", Object.entries(pds).length);
        for (const [ppEh, pd] of pds) {
            if (pd.zome_origin == "file_share_integrity") {
                const manifest = await this.deliveryZvm.zomeProxy.getManifest(decodeHashFromBase64(ppEh));
                publicFiles[manifest.data_hash] = ppEh;
            }
        }
        this._perspective.publicFiles = publicFiles;
        this.notifySubscribers();
        return publicFiles;
    }


    private _curIsPrivate?: boolean;
    private _curFile?: File;
    private _curSplitObj?: SplitObject;
    private _curChunks: EntryHash[] = [];


    /** */
    async startCommitPrivateFile(file: File): Promise<SplitObject> {
        console.log('dvm.commitPrivateFile: ', file);
        if (this._curSplitObj) {
            return Promise.reject("File commit already in progress");
        }
        const splitObj = await splitFile(file, this.dnaProperties.maxChunkSize);
        /** Check if file already present */
        if (this.deliveryZvm.perspective.localManifestByData[splitObj.dataHash]) {
            console.warn("File already stored locally");
            //return this.deliveryZvm.perspective.localManifestByData[splitObj.dataHash];
            return;
        }
        this._curSplitObj = splitObj;
        this._curChunks = [];
        this._curFile = file;
        this._curIsPrivate = true;
        //this.deliveryZvm.perspective.chunkCounts[splitObj.dataHash] = 0;
        /** Initial write chunk loop */
        this.fileShareZvm.zomeProxy.writePrivateFileChunk({data_hash: splitObj.dataHash, data: splitObj.chunks[0]});
        ///*const ehb64 =*/ await this.fileShareZvm.commitPrivateFile(file, splitObj);
        //return ehb64;
        return splitObj;
    }


    /** */
    async startPublishFile(file: File): Promise<SplitObject> {
        console.log('dvm.commitPublicFile: ', file);
        if (this._curSplitObj) {
            return Promise.reject("File commit already in progress");
        }
        const splitObj = await splitFile(file, this.dnaProperties.maxChunkSize);
        /** Check if file already present */
        if (this.deliveryZvm.perspective.localManifestByData[splitObj.dataHash]) {
            console.warn("File already stored locally");
            return;
        }
        this._curSplitObj = splitObj;
        this._curChunks = [];
        this._curFile = file;
        this._curIsPrivate = false;
        //this.deliveryZvm.perspective.chunkCounts[splitObj.dataHash] = 0;
        /** Initial write chunk loop */
        this.fileShareZvm.zomeProxy.writePrivateFileChunk({data_hash: splitObj.dataHash, data: splitObj.chunks[0]});
        ///*const ehb64 =*/ await this.fileShareZvm.commitPrivateFile(file, splitObj);
        //return ehb64;
        return splitObj;
    }

    // /** */
    // async publishFile(file: File): Promise<EntryHashB64> {
    //     console.log('dvm.commitPublicFile: ', file);
    //     const splitObj = await splitFile(file, this.dnaProperties.maxChunkSize);
    //     /** Check if file already present */
    //     if (this.deliveryZvm.perspective.localManifestByData[splitObj.dataHash]) {
    //         console.warn("File already stored locally");
    //         return this.deliveryZvm.perspective.localManifestByData[splitObj.dataHash];
    //     }
    //     const ehb64 = await this.fileShareZvm.publishFile(file, splitObj);
    //     return ehb64;
    // }


    /** */
    async getLocalFile(ppEh: EntryHashB64): Promise<[ParcelManifest, string]> {
        const manifest = await this.deliveryZvm.zomeProxy.getManifest(decodeHashFromBase64(ppEh));
        this.deliveryZvm.perspective.chunkCounts[manifest.data_hash] = 0;
        const dataB64 = await this.deliveryZvm.getParcelData(ppEh);
        return [manifest, dataB64];
    }


}
