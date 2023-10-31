import {css, html, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {DnaElement, ZomeElement} from "@ddd-qc/lit-happ";
import {
    encodeHashToBase64,
} from "@holochain/client";
import {consume} from "@lit-labs/context";
import {globalProfilesContext} from "../viewModels/happDef";
import {DeliveryPerspective, DeliveryZvm} from "@ddd-qc/delivery";
import {sharedStyles} from "../sharedStyles";
import {ProfilesZvm} from "@ddd-qc/profiles-dvm";


/**
 * @element
 */
@customElement("inbound-stack")
export class InboundStack extends ZomeElement<DeliveryPerspective, DeliveryZvm> {

    /** */
    constructor() {
        super(DeliveryZvm.DEFAULT_ZOME_NAME)
    }

    @consume({context: globalProfilesContext, subscribe: true})
    _profilesZvm!: ProfilesZvm;


    /** */
    render() {
        //console.log("<inbound-stack>.render()");
        if (!this._profilesZvm) {
            console.warn("profilesZvm missing in <inbound-stack>");
            return html``;
        }

        const currentInbounds = Object.values(this._zvm.inbounds())
            .filter((tuple) => tuple[2] >= 0);

        const items = currentInbounds
            .map(([notice, _ts, pct]) => {
                const maybeProfile = this._profilesZvm.getProfile(encodeHashToBase64(notice.sender));
                const senderName = maybeProfile? maybeProfile.nickname : "unknown";
                return html`
                    <div class="fab-inbound">
                        <span style="font-weight: bold; overflow:clip; width: inherit">${notice.summary.parcel_reference.description.name}</span>
                        <sl-icon name="arrow-left"></sl-icon>
                        <span class="nickname">${senderName}</span>
                        <sl-progress-bar .value=${pct}>${pct}%</sl-progress-bar>
                    </div>
                `;
            });


        /** render all */
        return html`
            <div id="inbound-stack">
                ${items}
            </div>
        `;
    }

    /** */
    static get styles() {
        return [
            sharedStyles,
            css`
            :host {
              position: absolute;
              bottom: 15px;
              right: 90px;
            } 
            #inbound-stack {
              display: flex;
              flex-direction: row-reverse;
            }
            .fab-inbound {
                width: 250px;
                margin-botton: 10px;
                margin-left: 10px;
                padding: 5px;
                background: #ffffff;
                border-radius: 12px;
                box-shadow: rgba(0, 0, 0, 0.3) 0px 19px 38px, rgba(0, 0, 0, 0.22) 0px 15px 12px;
              }              
            `,
        ];
    }
}
