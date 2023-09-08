import { DnaViewModel, ZvmDef } from "@ddd-qc/lit-happ";
import {DeliveryZvm, SignalProtocol, SignalProtocolType} from "@ddd-qc/delivery";
import {AgentPubKeyB64, AppSignalCb, encodeHashToBase64, EntryHashB64} from "@holochain/client";
import {AppSignal} from "@holochain/client/lib/api/app/types";
import {FileSharePerspective, FileShareZvm} from "./fileShare.zvm";
import {NoticeStateType} from "@ddd-qc/delivery";


/** */
export interface FileShareDvmPerspective {
    /** AgentPubKey -> notice_eh */
    unrepliedRequests: Record<AgentPubKeyB64, EntryHashB64>,
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

    private _perspective: FileShareDvmPerspective = {unrepliedRequests: {}};


    protected hasChanged(): boolean {return true}

    get perspective(): FileShareDvmPerspective { return this._perspective }


    /** -- Methods -- */

    /** */
    mySignalHandler(signal: AppSignal): void {
        console.log("FileShareDvm received signal", signal);
        // const deliverySignal = signal.payload as SignalProtocol;
        // if (SignalProtocolType.ReceivedNotice in deliverySignal) {
        //     console.log("ADDING DeliveryNotice", deliverySignal.ReceivedNotice);
        //     const noticeEh = encodeHashToBase64(deliverySignal.ReceivedNotice[0]);
        //     this._perspective.newDeliveryNotices[noticeEh] = deliverySignal.ReceivedNotice[1];
        // }
        // if (SignalProtocolType.ReceivedReply in deliverySignal) {
        //     console.log("ADDING ReplyReceived", deliverySignal.ReceivedReply);
        // }
        // if (SignalProtocolType.ReceivedParcel in deliverySignal) {
        //     console.log("ADDING ParcelReceived", deliverySignal.ReceivedParcel);
        // }
        // if (SignalProtocolType.ReceivedReceipt in deliverySignal) {
        //     console.log("ADDING DeliveryReceipt", deliverySignal.ReceivedReceipt);
        // }
    }


    /** */
    async processInbox(): Promise<void> {
        await this.deliveryZvm.probeInbox();
        await this.determineUnrepliedRequests();
    }


    /** */
    async determineUnrepliedRequests(): Promise<void> {
        this._perspective.unrepliedRequests = {};
        console.log("determineUnrepliedRequests allNotices count", Object.entries(this.deliveryZvm.perspective.allNotices).length);
        for (const [eh, [_ts, notice]] of Object.entries(this.deliveryZvm.perspective.allNotices)) {
            const state = await this.deliveryZvm.getNoticeState(encodeHashToBase64(notice.distribution_eh));
            console.log("determineUnrepliedRequests state", state);
            if (NoticeStateType.Unreplied in state) {
                this._perspective.unrepliedRequests[encodeHashToBase64(notice.sender)] = eh;
            }
        }
        console.log("determineUnrepliedRequests count", Object.values(this._perspective.unrepliedRequests));
    }

}
