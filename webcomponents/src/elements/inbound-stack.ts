import {css, html, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {DnaElement, ZomeElement} from "@ddd-qc/lit-happ";
import {
    encodeHashToBase64,
} from "@holochain/client";
import {consume} from "@lit-labs/context";
import {globalProfilesContext} from "../contexts";
import {DeliveryPerspective, DeliveryZvm} from "@ddd-qc/delivery";
import {filesSharedStyles} from "../sharedStyles";
import {ProfilesZvm} from "@ddd-qc/profiles-dvm";
import {kind2Icon} from "../fileTypeUtils";
import {Dictionary} from "@ddd-qc/cell-proxy";
import {getCompletionPct} from "../utils";


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


    /** distribAh -> bool */
    @state() private _canDisplay: Dictionary<boolean> = {};

    /** */
    render() {
        const windowInnerWidth  = document.documentElement.clientWidth; // window.innerWidth;
        console.log("<inbound-stack>.render()", windowInnerWidth);
        if (!this._profilesZvm) {
            console.warn("profilesZvm missing in <inbound-stack>");
            return html``;
        }

        const incompletes = Object.values(this._zvm.inbounds()[1])
            .filter((tuple) => tuple[2].size >= 0);

        const items = incompletes
            .map(([notice, _ts, missingChunks]) => {
                const maybeProfile = this._profilesZvm.getProfile(encodeHashToBase64(notice.sender));
                const senderName = maybeProfile? maybeProfile.nickname : "unknown";
                const distribAh = encodeHashToBase64(notice.distribution_ah);
                if (this._canDisplay[distribAh] == undefined) {
                    this._canDisplay[distribAh] = true;
                }
                const canDisplay = missingChunks.size > 0 && this._canDisplay[distribAh];
                if (!canDisplay) {
                    return html``;
                }
                let pct = getCompletionPct(this._zvm, notice, missingChunks);
                return html`
                    <div class="fab-inbound">
                        <div style="display:flex; flex-direction:row; gap:35px;">
                            <sl-progress-bar style="flex-grow:1;" .value=${pct}>${pct}%</sl-progress-bar>
                            <sl-icon-button name="x" label="close"
                                            @click=${async (_e) => {this._canDisplay[distribAh] = false; this.requestUpdate()}}>
                            </sl-icon-button>
                        </div>
                        <div style="display:flex; flex-direction:row; gap:5px;">
                            <span class="nickname">${senderName}</span>                            
                            <sl-icon name="arrow-right"></sl-icon>
                            <sl-icon class="prefixIcon" name=${kind2Icon(notice.summary.parcel_reference.description.kind_info)}></sl-icon>
                            <span style="font-weight: bold; max-width: 175px; width:inherit; margin-right:3px;">${notice.summary.parcel_reference.description.name}</span>
                        </div>
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
            filesSharedStyles,
            css`
            :host {
            }

            sl-icon-button::part(base) {
              padding: 0px;
              background: #e6e6e6; 
            }
              
            #inbound-stack {
              display: flex;
              flex-direction: row-reverse;
            }
            .fab-inbound {
              display: flex;
              flex-direction: column;
              gap: 8px;
              padding: 8px 8px 7px 10px;
              width: 250px;
              border-radius: 6px;              
              //margin-botton: 10px;
              //margin-left: 10px;
              background: #ffffff;
              box-shadow: rgba(0, 0, 0, 0.3) 0px 19px 38px, rgba(0, 0, 0, 0.22) 0px 15px 12px;
            }              
            `,
        ];
    }
}
