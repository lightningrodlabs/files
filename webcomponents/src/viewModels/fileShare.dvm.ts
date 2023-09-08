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


/** */
export interface FileShareDvmPerspective {
    /** AgentPubKey -> notice_eh */
    unrepliedInbounds: Record<AgentPubKeyB64, EntryHashB64>,
    /** distrib_eh -> [Timestamp , AgentPubKey -> DeliveryState] */
    unrepliedOutbounds: Record<EntryHashB64, [Timestamp, Record<AgentPubKeyB64, DeliveryState>]>,
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

    private _perspective: FileShareDvmPerspective = {unrepliedInbounds: {}, unrepliedOutbounds: {}};


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
        await this.determineUnrepliedInbounds();
        await this.determineUnrepliedOutbounds();
    }


    /** */
    async determineUnrepliedInbounds(): Promise<void> {
        this._perspective.unrepliedInbounds = {};
        console.log("determineUnrepliedInbounds allNotices count", Object.entries(this.deliveryZvm.perspective.allNotices).length);
        for (const [eh, [_ts, notice]] of Object.entries(this.deliveryZvm.perspective.allNotices)) {
            const state = await this.deliveryZvm.getNoticeState(encodeHashToBase64(notice.distribution_eh));
            console.log("determineUnrepliedInbounds state", state);
            if (NoticeStateType.Unreplied in state) {
                this._perspective.unrepliedInbounds[encodeHashToBase64(notice.sender)] = eh;
            }
        }
        console.log("determineUnrepliedInbounds count", Object.values(this._perspective.unrepliedInbounds));
    }


    /** */
    async determineUnrepliedOutbounds(): Promise<void> {
        this._perspective.unrepliedOutbounds = {};
        console.log("determineUnrepliedOutbounds allDistributions count", Object.entries(this.deliveryZvm.perspective.allDistributions).length);
        for (const [eh, [ts, distrib]] of Object.entries(this.deliveryZvm.perspective.allDistributions)) {
            const state = await this.deliveryZvm.getDistributionState(eh);
            console.log("determineUnrepliedOutbounds distrib state", state);
            if (DistributionStateType.Unsent in state || DistributionStateType.AllNoticesSent in state || DistributionStateType.AllNoticeReceived in state) {
                console.log("determineUnrepliedOutbounds recipients", distrib.recipients.length);
                let deliveries = {};
                for (const recipient of distrib.recipients) {
                    const agentB64 = encodeHashToBase64(recipient);
                    const deliveryState = await this.deliveryZvm.getDeliveryState(eh, agentB64);
                    console.log("determineUnrepliedOutbounds state", deliveryState, agentB64);
                    deliveries[agentB64] = deliveryState;
                }
                this._perspective.unrepliedOutbounds[eh] = [ts, deliveries];
            }
        }
        console.log("determineUnrepliedOutbounds count", Object.values(this._perspective.unrepliedOutbounds));
    }
}
