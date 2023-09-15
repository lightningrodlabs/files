import { DnaViewModel, ZvmDef } from "@ddd-qc/lit-happ";
import {
    DeliveryState,
    DeliveryStateType,
    DeliveryZvm,
    DistributionStateType, ParcelManifest,
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
import {arrayBufferToBase64, splitFile} from "../utils";
import {FILE_TYPE_NAME} from "../bindings/file_share.types";


// /** */
// export interface FileShareDvmPerspective {
//     /** AgentPubKey -> notice_eh */
//     unrepliedInbounds: Record<AgentPubKeyB64, EntryHashB64>,
//     /** distrib_eh -> [Timestamp , AgentPubKey -> DeliveryState] */
//     unrepliedOutbounds: Record<EntryHashB64, [Timestamp, Record<AgentPubKeyB64, DeliveryState>]>,
// }


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

    //private _perspective: FileShareDvmPerspective = {unrepliedInbounds: {}, unrepliedOutbounds: {}};


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
    //get perspective(): FileShareDvmPerspective { return this._perspective }
    get perspective(): unknown { return {} }


    /** -- Methods -- */

    /** */
    mySignalHandler(signal: AppSignal): void {
        console.log("FileShareDvm received signal", signal);
        const deliverySignal = signal.payload as SignalProtocol;
        if (SignalProtocolType.NewReceptionProof in deliverySignal) {
            console.log("signal NewReceptionProof", deliverySignal.NewReceptionProof);
            this.fileShareZvm.getLocalFiles();
        }
    }


    /** */
    async commitFile(file: File): Promise<EntryHashB64> {
        console.log('dvm.commitFile: ', file)

        // /** Causes stack error on big files */
        // if (!base64regex.test(file.content)) {
        //   const invalid_hash = sha256(file.content);
        //   console.error("File '" + file.name + "' is invalid base64. hash is: " + invalid_hash);
        // }

        const content = await file.arrayBuffer();
        const contentB64 = arrayBufferToBase64(content);

        const splitObj = await splitFile(contentB64);
        console.log({splitObj})

        /** Check if file already present */
        if (this.deliveryZvm.perspective.manifestByData[splitObj.dataHash]) {
            console.warn("File already stored locally");
            return this.deliveryZvm.perspective.manifestByData[splitObj.dataHash];
        }

        const ehb64 = await this.fileShareZvm.commitFile(file, splitObj);
        return ehb64;
    }

    /** */
    async getFile(ppEh: EntryHashB64): Promise<[ParcelManifest, string]> {

        const [] = await this.deliveryZvm.pullParcel(ppEh);
        return this.zomeProxy.getFile(decodeHashFromBase64(eh));
    }


}
