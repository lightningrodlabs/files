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
import {arrayBufferToBase64, splitData, splitFile} from "../utils";
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
        console.log('properties', properties);
        return properties;
    }

    /** -- Methods -- */

    /** */
    mySignalHandler(signal: AppSignal): void {
        console.log("FileShareDvm received signal", signal);
        const deliverySignal = signal.payload as SignalProtocol;
        if (SignalProtocolType.NewReceptionProof in deliverySignal) {
            console.log("signal NewReceptionProof", deliverySignal.NewReceptionProof);
            this.fileShareZvm.getPrivateFiles();
        }
        if (SignalProtocolType.NewPublicParcel in deliverySignal) {
            console.log("signal NewPublicParcel", deliverySignal.NewPublicParcel);
            const ppEh = encodeHashToBase64(deliverySignal.NewPublicParcel.eh);
            this.deliveryZvm.zomeProxy.pullManifest(decodeHashFromBase64(ppEh)).then((manifest: ParcelManifest) => {
                this._perspective.publicFiles[manifest.data_hash] = ppEh;
                this.notifySubscribers();
            })
        }
    }


    /** */
    async probePublicFiles(): Promise<Dictionary<string>> {
        let publicFiles: Dictionary<string> = {};
        const pds = Object.entries(this.deliveryZvm.perspective.publicParcels);
        console.log("probePublicFiles() PublicParcels count", Object.entries(pds).length);
        for (const [ppEh, pd] of pds) {
            if (pd.zome_origin == "file_share_integrity") {
                const manifest = await this.deliveryZvm.zomeProxy.pullManifest(decodeHashFromBase64(ppEh));
                publicFiles[manifest.data_hash] = ppEh;
            }
        }
        this._perspective.publicFiles = publicFiles;
        this.notifySubscribers();
        return publicFiles;
    }


    /** */
    async commitPrivateFile(file: File): Promise<EntryHashB64> {
        console.log('dvm.commitPrivateFile: ', file);
        const splitObj = await splitFile(file, this.dnaProperties.maxChunkSize);
        /** Check if file already present */
        if (this.deliveryZvm.perspective.localManifestByData[splitObj.dataHash]) {
            console.warn("File already stored locally");
            return this.deliveryZvm.perspective.localManifestByData[splitObj.dataHash];
        }
        const ehb64 = await this.fileShareZvm.commitPrivateFile(file, splitObj);
        return ehb64;
    }


    /** */
    async publishFile(file: File): Promise<EntryHashB64> {
        console.log('dvm.commitPublicFile: ', file);
        const splitObj = await splitFile(file, this.dnaProperties.maxChunkSize);
        /** Check if file already present */
        if (this.deliveryZvm.perspective.localManifestByData[splitObj.dataHash]) {
            console.warn("File already stored locally");
            return this.deliveryZvm.perspective.localManifestByData[splitObj.dataHash];
        }
        const ehb64 = await this.fileShareZvm.publishFile(file, splitObj);
        return ehb64;
    }


    /** */
    async getLocalFile(ppEh: EntryHashB64): Promise<[ParcelManifest, string]> {
        const manifest = await this.deliveryZvm.zomeProxy.pullManifest(decodeHashFromBase64(ppEh));
        const dataB64 = await this.deliveryZvm.pullParcelData(ppEh);
        return [manifest, dataB64];
    }


}
