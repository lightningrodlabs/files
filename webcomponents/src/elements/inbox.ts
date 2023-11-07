import {css, html, PropertyValues, TemplateResult} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {delay, DnaElement} from "@ddd-qc/lit-happ";
import {consume} from "@lit-labs/context";
import {FilesDvm} from "../viewModels/files.dvm";
import {
    DeliveryPerspective,
} from "@ddd-qc/delivery";
import {globalProfilesContext} from "../contexts";
import {ActionHashB64, AgentPubKeyB64, encodeHashToBase64, EntryHashB64, Timestamp} from "@holochain/client";
import {FileView} from "./file-view";
import {filesSharedStyles} from "../sharedStyles";
import {ProfilesZvm, agent2avatar} from "@ddd-qc/profiles-dvm";
import {prettyFileSize} from "../utils";


/**
 * @element
 */
@customElement("files-inbox")
export class Inbox extends DnaElement<unknown, FilesDvm> {

    @state() private _initialized = false;

    /** Observed perspective from zvm */
    @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
    deliveryPerspective!: DeliveryPerspective;

    @consume({ context: globalProfilesContext, subscribe: true })
    _profilesZvm!: ProfilesZvm;



    /** */
    get fileViewElem() : FileView {
        return this.shadowRoot.getElementById("file-view") as FileView;
    }


    /**
     * In dvmUpdated() this._dvm is not already set!
     * Subscribe to ZVMs
     */
    protected async dvmUpdated(newDvm: FilesDvm, oldDvm?: FilesDvm): Promise<void> {
        console.log("<activity-timeline>.dvmUpdated()");
        if (oldDvm) {
            //console.log("\t Unsubscribed to Zvms roleName = ", oldDvm.fileShareZvm.cell.name)
            oldDvm.deliveryZvm.unsubscribe(this);
        }
        newDvm.deliveryZvm.subscribe(this, 'deliveryPerspective');
        //console.log("\t Subscribed Zvms roleName = ", newDvm.fileShareZvm.cell.name)
        this._initialized = true;
    }


    //
    // /** */
    // activityLog2Html(log: ActivityLog): TemplateResult<1> {
    //
    //     /** Format date */
    //     const date = new Date(log.timestamp / 1000); // Holochain timestamp is in micro-seconds, Date wants milliseconds
    //     const date_str = date.toLocaleString('en-US', {hour12: false});
    //
    //     /**  */
    //     let message: string;
    //     let manifestEh: EntryHashB64;
    //     let peer: AgentPubKeyB64;
    //     switch (log.type) {
    //         case ActivityLogType.DeliveryDeclined: {
    //             const variant = log.value as ActivityLogTypeVariantDeliveryDeclined;
    //             manifestEh = encodeHashToBase64(this.deliveryPerspective.distributions[variant.distributionAh][0].delivery_summary.parcel_reference.eh);
    //             message = `was declined by`;
    //             peer = variant.peer;
    //             break;}
    //         case ActivityLogType.DeliveryReceived: {
    //             const variant = log.value as ActivityLogTypeVariantDeliveryReceived;
    //             manifestEh = encodeHashToBase64(this.deliveryPerspective.distributions[variant.distributionAh][0].delivery_summary.parcel_reference.eh);
    //             message = `was received by`;
    //             peer = variant.peer;
    //             break;}
    //         case ActivityLogType.ReceivedFile: {
    //             const variant = log.value as ActivityLogTypeVariantReceivedFile;
    //             manifestEh = variant.manifestEh;
    //             message = `was sent to you by`;
    //             peer = variant.peer;
    //             break;}
    //         case ActivityLogType.NewGroupFile: {
    //             const variant = log.value as ActivityLogTypeVariantNewGroupFile;
    //             manifestEh = variant.manifestEh;
    //             message = `has been shared by`;
    //             peer = variant.peer;
    //             break;}
    //         case ActivityLogType.NewPersonalFile: {
    //             const variant = log.value as ActivityLogTypeVariantNewPersonalFile;
    //             manifestEh = variant.manifestEh;
    //             peer = this.cell.agentPubKey;
    //             message = `was added privately by`;
    //             break;}
    //     }
    //
    //     //const manifest = this.deliveryPerspective.lo
    //     // if (!manifest) {
    //     //     return html`<sl-skeleton effect="sheen"></sl-skeleton>`
    //     // }
    //     //const id = "activity-item__" + manifestEh;
    //
    //     const [profile, _avatar] = agent2avatar(peer, this._profilesZvm.perspective);
    //     const authorSpan = peer == this.cell.agentPubKey
    //         ? html`<span style="font-weight: bold;">yourself</span>`
    //         : html`<span class="nickname">${profile.nickname}</span>`;
    //
    //     /** render */
    //     return html`
    //     <div class="activityItem">
    //         <div class="activityDate"> ${date_str}</div>
    //         <div class="activityLine">
    //             <file-button .hash="${manifestEh}"></file-button>
    //             <div class="activityMsg">
    //                 ${message}
    //                 ${authorSpan}
    //             </div>
    //         </div>
    //     </div>
    // `;
    // }


    /** */
    render() {
        console.log("<activity-timeline>.render()", this._initialized);

        let items = [
            html`<sl-skeleton effect="sheen"></sl-skeleton>`,
            html`<sl-skeleton effect="sheen"></sl-skeleton>`,
            html`<sl-skeleton effect="sheen"></sl-skeleton>`,
        ];

        if (this._initialized) {
            let unrepliedInbounds: TemplateResult<1>[] = [];
            items = Object.entries(this._dvm.deliveryZvm.inbounds()).map(
                ([noticeEh, [notice, ts, pct]]) => {
                    console.log("" + noticeEh, this.deliveryPerspective.notices[noticeEh]);
                    const senderKey = encodeHashToBase64(notice.sender);
                    const senderProfile = this._profilesZvm.getProfile(senderKey);
                    let sender = senderKey;
                    if (senderProfile) {
                        sender = senderProfile.nickname;
                    }

                    /** Format date */
                    const date = new Date(ts / 1000); // Holochain timestamp is in micro-seconds, Date wants milliseconds
                    const date_str = date.toLocaleString('en-US', {hour12: false});

                    if (pct == -1) {
                        const unrepliedLi = html`
                        <div id="inbound_${noticeEh}" class="inboxLine inbound">
                            <file-button .description=${notice.summary.parcel_reference.description}></file-button>
                            is being sent by
                            <span class="nickname">${sender}</span>
                            <div class="gap"></div>
                            <sl-button id="decline-button" type="button" @click=${()=> {this._dvm.deliveryZvm.declineDelivery(noticeEh);}}>
                                Decline
                            </sl-button>                            
                            <sl-button id="accept-button" type="button" @click=${() => {this._dvm.deliveryZvm.acceptDelivery(noticeEh);}}>
                                Accept
                            </sl-button>
                            <div class="activityDate">${date_str}</div>
                        </div>`
                        unrepliedInbounds.push(unrepliedLi);
                        return unrepliedLi;
                    } else {
                        return html`
                            <div id="inbound_${noticeEh}" class="inboxLine">
                                <file-button .description=${notice.summary.parcel_reference.description}></file-button>
                                from
                                <span class="nickname">${sender}</span>
                                <div class="gap"></div>
                                <div style="display:flex; flex-direction:row; width:100px;">
                                    <sl-progress-bar .value=${pct}>${pct}%</sl-progress-bar>
                                    <sl-icon-button name="play-fill" @click=${() => {this._dvm.deliveryZvm.zomeProxy.requestMissingChunks(notice.summary.parcel_reference.eh)}}></sl-icon-button>
                                </div>
                                <div class="activityDate">${date_str}</div>
                            </div>
                        `;
                    }
                });
            if (items.length == 0) {
                items.push(html`None`);
            }
        }


        /** Render all */
        return html`
            <div id="action-bar">
            <sl-button>
                <sl-icon slot="prefix" name="sort-down"></sl-icon>
                Most Recent
            </sl-button>
            <div class="gap"></div>
            <sl-button><sl-icon name="sliders"></sl-icon></sl-button>
            </div>
            <div id="list-div">
                ${items}
            </div>
        `;
    }


    /** */
    static get styles() {
        return [
            filesSharedStyles,
            css`

              sl-progress-bar {
                flex-grow: 1;
                padding-top: 2px;
                --height: 15px;
                padding-right: 5px;
              }
              
              sl-icon-button::part(base) {
                padding: 2px;
                background: #e6e6e6;
              }

              .gap {
                min-width: 10px;
                flex-grow: 1;
              }

              #action-bar {
                margin-top: 20px;
                display: flex;
                flex-direction: row;
                padding-right: 20px;
              }

              #list-div {
                margin-top: 10px;
              }

              sl-icon {
                font-weight: bold;
                font-size: 1rem;
              }

              sl-button::part(base) {
                font-weight: bold;
                background: #E9F0F3;
                border: none;
              }

              .inboxItem {
                display: flex;
                flex-direction: row-reverse;
                align-content: center;
                align-items: center;
                margin-bottom: 10px;
              }

              .inboxLine {
                display: flex;
                flex-direction: row;
                min-height: 45px;
                align-content: center;
                align-items: center;
                flex-grow: 2;
                gap: 5px;
                padding: 5px;
                border-radius: 6px;
              }

              .inbound {
                background: rgb(221, 237, 251);
              }

              .activityDate {
                margin: 0px 0px 0px 5px;
                font-size: small;
                color: gray;
              }

              .activityMsg {
                margin: 5px 5px 5px 5px;
              }

              #accept-button::part(base) {
                background: green;
                color: white;
              }

              #accept-button::part(base):hover {
                color: green;
                background: white;
                border: 1px solid green;
              }

              #decline-button::part(base) {
                background: #21374A;
                color: white;
              }

              #decline-button::part(base):hover {
                color: #21374A;
                background: white;
                border: 1px solid #21374A;
              }
            `,];
    }

}