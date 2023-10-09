import {css, html, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {FileShareDvm} from "../viewModels/fileShare.dvm";
import {sharedStyles} from "../sharedStyles";
import {FileShareDvmPerspective} from "../viewModels/fileShare.perspective";
import {SlDialog, SlMenu, SlSelect} from "@shoelace-style/shoelace";
import {arrayBufferToBase64, prettyFileSize, splitData, splitFile, SplitObject} from "../utils";
import {toastError} from "../toast";
import {AgentPubKeyB64, EntryHashB64} from "@holochain/client";
import {consume} from "@lit-labs/context";
import {globalProfilesContext} from "../viewModels/happDef";
import {ProfilesZvm} from "../viewModels/profiles.zvm";
import {ParcelDescription} from "@ddd-qc/delivery";
import {ComboBoxFilterChangedEvent} from "@vaadin/combo-box";
import {ComboBoxLitRenderer, comboBoxRenderer} from "@vaadin/combo-box/lit";

//import '@vaadin/combo-box/theme/lumo/vaadin-combo-box.js';

interface AgentItem {
    key: AgentPubKeyB64,
    name: string,
}

/**
 * @element
 */
@customElement("send-dialog")
export class SendDialog extends DnaElement<FileShareDvmPerspective, FileShareDvm> {

    @state() private _allAgents: AgentItem[] = [];
    @state() private _filteredAgents: AgentItem[] = [];
    @state() private _recipient?: AgentPubKeyB64;

    @state() private _description?: ParcelDescription;
    @state() private _file?: File;
    private _splitObj?: SplitObject;

    @consume({ context: globalProfilesContext, subscribe: true })
    _profilesZvm!: ProfilesZvm;

    /** -- Getters -- */

    get dialogElem() : SlDialog {
        return this.shadowRoot.getElementById("send-dialog-inner") as SlDialog;
    }

    get recipientElem() : SlSelect {
        return this.shadowRoot.getElementById("recipientSelector") as SlSelect;
    }

    /** -- Methods -- */

    /** */
    open(hash?: EntryHashB64) {
        if (hash) {
            this._dvm.localParcel2File(hash).then((file) => {
                splitFile(file, this._dvm.dnaProperties.maxChunkSize).then((splitObj) => {
                    this._splitObj = splitObj;
                    this._file = file;
                    this.dialogElem.open = true;
                })
            });
            return;
        }
        var input = document.createElement('input');
        input.type = 'file';
        input.onchange = async (e:any) => {
                const file = e.target.files[0];
                if (file.size > this._dvm.dnaProperties.maxParcelSize) {
                    toastError(`File is too big ${prettyFileSize(file.size)}. Maximum file size: ${prettyFileSize(this._dvm.dnaProperties.maxParcelSize)}`)
                    return;
                }
                this._splitObj = await splitFile(file, this._dvm.dnaProperties.maxChunkSize);
                this._file = file;
                this.dialogElem.open = true;
            }
        input.click();
    }


    /** */
    protected override async firstUpdated() {
        const agentItems = Object.entries(this._profilesZvm.perspective.profiles).map(
            ([agentIdB64, profile]) => {return {key: agentIdB64, name: profile.nickname} as AgentItem});
        this._allAgents = agentItems;
        console.log("_allAgents", this._allAgents);
        this._filteredAgents = agentItems;
    }


    /** */
    private filterChanged(event: ComboBoxFilterChangedEvent) {
        const filter = event.detail.value;
        console.log("filter", filter);
        this._filteredAgents = this._allAgents.filter(({ name }) =>
            name.toLowerCase().startsWith(filter.toLowerCase())
        );
        console.log("_filteredAgents", this._filteredAgents);
    }


//     private agentRenderer: ComboBoxLitRenderer<AgentItem> = (agent) => html`
//   <div style="display: flex;">
//     <img
//       style="height: var(--lumo-size-m); margin-right: var(--lumo-space-s);"
//       src="${this._profilesZvm.perspective.profiles[agent.key].fields["avatar"]}"
//       alt="Portrait of ${agent.name}"
//     />
//     <div>
//       ${agent.name}
//     </div>
//   </div>
// `;

    private agentRenderer: ComboBoxLitRenderer<AgentItem> = (agent) => html`
  <div style="display: flex; width: 100%;">
    <div>
      ${agent.name}
    </div>
  </div>
`;



    /** */
    render() {
        console.log("<send-dialog>.render()", this._file, this._recipient, this._allAgents);

        // ${comboBoxRenderer(this.agentRenderer, [])}

        /** render all */
        return html`
            <sl-dialog id="send-dialog-inner" 
                       label='Send "${this._file? this._file.name : ""}" ?' @sl-request-close=${e => this._file = undefined}
                       style="--width: 600px;"
            >
                <div style="margin-left:10px;">
                    <div>Size: ${prettyFileSize(this._file? this._file.size : 0)}</div>                    
                    <div>Type: ${this._file? this._file.type : ""}</div>
                    <div>Hash: ${!this._file || !this._splitObj? "" : this._splitObj.dataHash}</div>
                </div>
                to:       
                <vaadin-combo-box
                    label=""
                    item-label-path="name"
                    item-value-path="key"
                    .items=${this._allAgents}
                    .filteredItems=${this._filteredAgents}
                    @filter-changed=${this.filterChanged}
                    @selected-item-changed=${(e) => {console.log("filter selected:", e.detail); this._recipient = e.detail.value}}
                ></vaadin-combo-box>
                <sl-button slot="footer" variant="neutral" @click=${(e) => {this._file = undefined; this.dialogElem.open = false;}}>Cancel</sl-button>
                <sl-button slot="footer" variant="primary" ?disabled=${!this._file || !this._recipient} @click=${async (e) => {
                        this.dispatchEvent(new CustomEvent('sendStarted', {detail: {splitObj: this._splitObj, recipient: this._recipient}, bubbles: true, composed: true}));
                        const _splitObject = await this._dvm.startCommitPrivateFile(this._file);
                        this._file = undefined;
                        this._recipient = undefined;
                        this.dialogElem.open = false;
                    }}>
                    Send
                </sl-button>
                
            </sl-dialog>
        }
        `;
    }


    /** */
    static get styles() {
        return [
            sharedStyles,
            css`
              sl-dialog::part(base) {
                z-index:auto;
              }
            `
        ];
    }
}
