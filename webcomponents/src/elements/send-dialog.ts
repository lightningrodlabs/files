import {css, html, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {consume} from "@lit-labs/context";
import {FileShareDvm} from "../viewModels/fileShare.dvm";
import {sharedStyles} from "../sharedStyles";
import {FileShareDvmPerspective} from "../viewModels/fileShare.perspective";
import {SlDialog, SlInput, SlMenu, SlSelect} from "@shoelace-style/shoelace";
import {arrayBufferToBase64, prettyFileSize, splitData, splitFile, SplitObject} from "../utils";
import {toastError} from "../toast";
import {AgentPubKeyB64, decodeHashFromBase64, EntryHashB64} from "@holochain/client";
import {globalProfilesContext} from "../viewModels/happDef";
import {ProfilesPerspective, ProfilesZvm} from "../viewModels/profiles.zvm";
import {DeliveryPerspective, ParcelDescription} from "@ddd-qc/delivery";
import {ComboBoxFilterChangedEvent} from "@vaadin/combo-box";
import {ComboBoxLitRenderer, comboBoxRenderer} from "@vaadin/combo-box/lit";
import {MultiSelectComboBoxSelectedItemsChangedEvent} from "@vaadin/multi-select-combo-box";


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

    @state() private _file?: File;
    private _splitObj?: SplitObject;

    @consume({ context: globalProfilesContext, subscribe: true })
    _profilesZvm!: ProfilesZvm;


    @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
    profilesPerspective!: ProfilesPerspective;


    /** -- Getters -- */

    get dialogElem() : SlDialog {
        return this.shadowRoot.getElementById("send-dialog-inner") as SlDialog;
    }

    get recipientElem() : HTMLElement {
        return this.shadowRoot.getElementById("recipientSelector") as HTMLElement;
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
        const input = document.createElement('input');
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
    protected async firstUpdated() {
        const agentItems = Object.entries(await this._profilesZvm.probeAllProfiles()).map(
            ([agentIdB64, profile]) => {return {key: agentIdB64, name: profile.nickname} as AgentItem});
        this._allAgents = agentItems;
        //console.log("_allAgents", this._allAgents);
        this._filteredAgents = agentItems;
    };


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

    /** */
    private agentRenderer: ComboBoxLitRenderer<AgentItem> = (agent) => html`
      <div style="display: flex; width: 100%;">
        <div>
          ${agent.name}
        </div>
      </div>
    `;


    @state() private _selectedTags = [];

    get inputElem() : SlInput {
        return this.shadowRoot.getElementById("tag-input") as SlInput;
    }


    async onAddTag(e) {
        console.log("tag sl-change", this.inputElem.value);
        await this._dvm.taggingZvm.addPrivateTag(this.inputElem.value);
        this.inputElem.value = "";
        this.requestUpdate();
    }


    /** */
    render() {
        console.log("<send-dialog>.render()", this._file, this._recipient, this._allAgents);

        // ${comboBoxRenderer(this.agentRenderer, [])}

        const allTags = this._dvm.taggingZvm.allPrivateTags.map((tag) => { return {value: tag};})

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
                    id="recipientSelector"
                    label=""
                    item-label-path="name"
                    item-value-path="key"
                    .items=${this._allAgents}
                    .filteredItems=${this._filteredAgents}
                    @filter-changed=${this.filterChanged}
                    @selected-item-changed=${(e) => {
                        console.log("filter selected:", e.detail); 
                        if (e.detail.value) {
                            this._recipient = e.detail.value.key;
                        } else {
                            this._recipient = null;  
                        }
                    }}
                ></vaadin-combo-box>
                
                <vaadin-multi-select-combo-box
                        label="Tags"
                        item-label-path="value"
                        item-id-path="value"
                        .items="${allTags}"
                        .selectedItems="${this._selectedTags}"
                        @selected-items-changed="${(e: MultiSelectComboBoxSelectedItemsChangedEvent<string>) => {
                            this._selectedTags = e.detail.value;
                        }}"
                ></vaadin-multi-select-combo-box>
                <sl-input id="tag-input" placeholder="Add tag" clearable
                          @sl-change=${this.onAddTag}
                >
                    <sl-icon name="plus" slot="prefix"></sl-icon>
                </sl-input>
                
                <sl-button slot="footer" variant="neutral" @click=${(e) => {this._file = undefined; this.dialogElem.open = false;}}>Cancel</sl-button>
                <sl-button slot="footer" variant="primary" ?disabled=${!this._file || !this._recipient} @click=${async (e) => {
                        this.dispatchEvent(new CustomEvent('send-started', {detail: {splitObj: this._splitObj, recipient: this._recipient}, bubbles: true, composed: true}));
                        const _splitObject = await this._dvm.startCommitPrivateAndSendFile(this._file, this._recipient, this._selectedTags.map((item) => item.value));
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
