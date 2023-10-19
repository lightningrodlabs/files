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
import {ComboBoxFilterChangedEvent} from "@vaadin/combo-box";
import {ComboBoxLitRenderer, comboBoxRenderer} from "@vaadin/combo-box/lit";
import {TagList} from "./tag-list";
import {kind2Icon} from "../fileTypeUtils";


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
    //@state() private _recipient?: AgentPubKeyB64;
    @state() private _recipients: AgentPubKeyB64[] = [];


    @state() private _file?: File;
    private _splitObj?: SplitObject;

    @consume({ context: globalProfilesContext, subscribe: true })
    _profilesZvm!: ProfilesZvm;


    @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
    profilesPerspective!: ProfilesPerspective;


    /** -- Getters -- */

    get dialogElem() : SlDialog {
        return this.shadowRoot.querySelector("sl-dialog") as SlDialog;
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


    @state() private _selectedTags: string[] = [];

    get inputElem() : SlInput {
        return this.shadowRoot.getElementById("tag-input") as SlInput;
    }

    get tagListElem() : TagList {
        return this.shadowRoot.getElementById("selected-tag-list") as TagList;
    }


    /** */
    async onAddNewPrivateTag(e) {
        console.log("onAddNewPrivateTag", e);
        await this._dvm.taggingZvm.addPrivateTag(e.detail);
        this._selectedTags.push(e.detail);
        if (this.tagListElem) this.tagListElem.requestUpdate();
        this.requestUpdate();
    }


    /** */
    render() {
        console.log("<send-dialog>.render()", this._recipients.length, this._file, this._allAgents, this._selectedTags);

        let content = html`<sl-spinner></sl-spinner>`;
        if (this._file) {
            // ${comboBoxRenderer(this.agentRenderer, [])}

            const allTags = this._dvm.taggingZvm.allPrivateTags
                .filter((tag) => this._selectedTags.indexOf(tag) < 0)

            content = html`
                <div id="filename">
                    <sl-icon class="prefixIcon" name=${kind2Icon({Manifest: this._file.type})}></sl-icon>                    
                    ${this._file.name} 
                    <span style="font-weight: normal">(${prettyFileSize(this._file.size)})</span>
                </div>
                <!--<<div style="margin-left:10px;">
                    <div>Size: ${prettyFileSize(this._file.size)}</div>
                        div>Type: ${this._file.type}</div> 
                    <div>Hash: ${!this._splitObj? "" : this._splitObj.dataHash}</div>
                </div> -->
                To:
                <profile-input
                        @selected=${(e) => {
                            console.log("profile selected:", e.detail);
                            if (e.detail) {
                                this._recipients.push(e.detail);
                                this.requestUpdate();
                            }
                        }}
                        @cleared=${(e) => {
                            console.log("profile cleared:", e.detail);
                            if (e.detail) {
                                const index = this._recipients.indexOf(e.detail);
                                if (index > -1) {
                                    this._recipients.splice(index, 1);
                                    this.requestUpdate();
                                }
                            }
                        }}                        
                ></profile-input>
                
                <sl-divider></sl-divider>
                
                <div style="margin-bottom: 5px; display:flex;">
                    <span style="margin-top: 10px;margin-right: 10px;">Tags:</span>
                    ${this._selectedTags.length == 0
                ? html``
                : html`
                            <tag-list id="selected-tag-list" selectable deletable
                                      .tags=${this._selectedTags}
                                      @deleted=${(e) => {
                    console.log("deleted tag", e.detail);
                    const index = this._selectedTags.indexOf(e.detail);
                    if (index > -1) {
                        this._selectedTags.splice(index, 1);
                    }
                    this.requestUpdate();
                    if(this.tagListElem) this.tagListElem.requestUpdate();
                }}
                            >
                            </tag-list>
                    `}
                </div>
                <tag-input .tags=${allTags}
                           @new-tag=${(e) => {console.log("e", e); this.onAddNewPrivateTag(e)}}
                           @selected=${(e) => {this._selectedTags.push(e.detail); this.requestUpdate(); if (this.tagListElem) this.tagListElem.requestUpdate();}}
                ></tag-input>


                <sl-button slot="footer" variant="neutral" @click=${(e) => {this._file = undefined; this.dialogElem.open = false;}}>Cancel</sl-button>
                <sl-button slot="footer" variant="primary" ?disabled=${this._recipients.length <= 0} @click=${async (e) => {
                this.dispatchEvent(new CustomEvent('send-started', {detail: {splitObj: this._splitObj, recipient: this._recipients[0]}, bubbles: true, composed: true}));
                //const _splitObject = await this._dvm.startCommitPrivateAndSendFile(this._file, this._recipient, this._selectedTags.map((item) => item.value));
                const _splitObject = await this._dvm.startCommitPrivateAndSendFile(this._file, this._recipients[0], this._selectedTags);
                this._file = undefined;
                this._selectedTags = [];
                this._recipients = [];
                this.dialogElem.open = false;
            }}>
                    Send
                </sl-button>
                
            `;

        }


        /** render all */
        return html`
            <sl-dialog class="action-dialog"
                       @sl-request-close=${e => this._file = undefined}>
                <div slot="label">
                    <sl-icon class="prefixIcon" name="send"></sl-icon>   
                    Sending
                </div>
                ${content}
            </sl-dialog>
        }
        `;
    }


    /** */
    static get styles() {
        return [
            sharedStyles,
            css`              
              sl-dialog {
                --width: 400px;
              } 
              sl-dialog::part(close-button) {
                color:white;
                font-size: 20px;
              }

              sl-divider {
                margin: 0px;
                margin-top: 0px;
                margin-top: 10px;
                border-color: #6f6f6f;                
              }
              
              #filename {
                background: white;
                color: #0089FF;
                border-radius: 6px;
                padding: 10px;
                font-weight: bold;
              }

            `
        ];
    }
}
