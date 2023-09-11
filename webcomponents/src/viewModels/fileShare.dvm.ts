import { DnaViewModel, ZvmDef } from "@ddd-qc/lit-happ";
import {
    DeliveryState,
    DeliveryStateType,
    DeliveryZvm,
    DistributionStateType,
    SignalProtocol,
    SignalProtocolType
} from "@ddd-qc/delivery";
import {AgentPubKeyB64, AppSignalCb, encodeHashToBase64, EntryHashB64, Timestamp} from "@holochain/client";
import {AppSignal} from "@holochain/client/lib/api/app/types";
import {FileSharePerspective, FileShareZvm} from "./fileShare.zvm";
import {NoticeStateType} from "@ddd-qc/delivery";


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
        this.notifySubscribers();
        // if (SignalProtocolType.ReceivedNotice in deliverySignal) {
        //     console.log("ADDING DeliveryNotice", deliverySignal.ReceivedNotice);
        //     const noticeEh = encodeHashToBase64(deliverySignal.ReceivedNotice[0]);
        //     this._perspective.newDeliveryNotices[noticeEh] = deliverySignal.ReceivedNotice[1];
        // }
        // if (SignalProtocolType.ReceivedReply in deliverySignal) {
        //     console.log("ADDING ReplyReceived", deliverySignal.ReceivedReply);
        // }
        if (SignalProtocolType.ReceivedParcel in deliverySignal) {
            console.log("signal ParcelReceived", deliverySignal.ReceivedParcel);
            this.fileShareZvm.getLocalFiles();
            //this.notifySubscribers();
        }
        // if (SignalProtocolType.ReceivedReceipt in deliverySignal) {
        //     console.log("ADDING DeliveryReceipt", deliverySignal.ReceivedReceipt);
        // }
    }


    // /** */
    // async processInbox(): Promise<void> {
    //     await this.deliveryZvm.probeAll();
    // }
}
