import {css, html} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {ZomeElement, AgentId, ActionId, ActionIdMap} from "@ddd-qc/lit-happ";
import {DeliveryPerspective, DeliveryZvm} from "@ddd-qc/delivery";
import {filesSharedStyles} from "../sharedStyles";
import {kind2Icon} from "../fileTypeUtils";
import {getCompletionPct} from "../utils";
import {ProfilesAltPerspective} from "@ddd-qc/profiles-dvm/dist/profilesAlt.perspective";
import {Profile} from "@ddd-qc/profiles-dvm";
import {Timestamp} from "@holochain/client";


/**
 * @element
 */
@customElement("inbound-stack")
export class InboundStack extends ZomeElement<DeliveryPerspective, DeliveryZvm> {

    /** */
    constructor() {
        super(DeliveryZvm.DEFAULT_ZOME_NAME)
    }

    @property() profiles?: ProfilesAltPerspective;

    /** distribAh -> bool */
    @state() private _canDisplay: ActionIdMap<boolean> = new ActionIdMap();


    /** */
    override render() {
      const windowInnerWidth  = document.documentElement.clientWidth; // window.innerWidth;
      console.log("<inbound-stack>.render()", windowInnerWidth, this.perspective);

      const inbounds = this._zvm.inbounds();
      const incompletes = Array.from(inbounds[1].values())
          .filter((tuple) => tuple[2].size > 0);

      console.debug("<inbound-stack>.render() incompletes", incompletes.length);


      const items = incompletes
          .map(([notice, _ts, missingChunks]) => {
            const sender = new AgentId(notice.sender);
            let maybeProfile: [Profile, Timestamp] | undefined = undefined;
            if (this.profiles) {
              const profileAh = this.profiles.profileByAgent.get(sender);
              if (profileAh) {
                maybeProfile = this.profiles.profiles.get(profileAh);
              }
            }
            //console.debug("<inbound-stack> profile", !!maybeProfile, sender.b64, missingChunks.size, this.profiles);
            const senderName = maybeProfile? maybeProfile[0].nickname : "unknown";
            const distribAh = new ActionId(notice.distribution_ah);
            if (this._canDisplay.get(distribAh) == undefined) {
                this._canDisplay.set(distribAh, true);
            }
            const canDisplay = missingChunks.size > 0 && this._canDisplay.get(distribAh);
            if (!canDisplay) {
                return html``;
            }
            let pct = getCompletionPct(this._zvm, notice, missingChunks);
            console.debug("<inbound-stack> missing chunks", missingChunks.size, pct, notice.summary.parcel_reference.description.name);
            return html`
                <div class="fab-inbound">
                    <div style="display:flex; flex-direction:row; gap:35px;">
                        <sl-progress-bar style="flex-grow:1;" .value=${pct}>${pct}%</sl-progress-bar>
                        <sl-icon-button name="x" label="close"
                                        @click=${async (_e:any) => {this._canDisplay.set(distribAh, false); this.requestUpdate()}}>
                        </sl-icon-button>
                    </div>
                    <div style="display:flex; flex-direction:row; gap:5px;">
                        <span class="nickname">${senderName}</span>                            
                        <sl-icon name="arrow-right"></sl-icon>
                        <sl-icon class="prefixIcon" name=${kind2Icon(notice.summary.parcel_reference.description.kind_info)}></sl-icon>
                        <files-filename style="font-weight: bold; max-width: 175px; width:inherit; margin-right:3px;" filename=${notice.summary.parcel_reference.description.name}></files-filename>
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
    static override get styles() {
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
              gap: 10px;
            }
            .fab-inbound {
              display: flex;
              flex-direction: column;
              gap: 8px;
              padding: 8px 8px 7px 10px;
              width: 250px;
              border-radius: 6px;
              background: #ffffff;
              box-shadow: rgba(0, 0, 0, 0.3) 0px 19px 38px, rgba(0, 0, 0, 0.22) 0px 15px 12px;
            }              
            `,
        ];
    }
}
