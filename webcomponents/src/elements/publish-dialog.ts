import {css, html, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {FileShareDvm} from "../viewModels/fileShare.dvm";
import {sharedStyles} from "../sharedStyles";
import {FileShareDvmPerspective} from "../viewModels/fileShare.perspective";
import {SlDialog, SlInput} from "@shoelace-style/shoelace";
import {prettyFileSize, splitFile, SplitObject} from "../utils";
import {toastError} from "../toast";
import {MultiSelectComboBoxSelectedItemsChangedEvent} from "@vaadin/multi-select-combo-box";
import {TagList} from "./tag-list";



/**
 * @element
 */
@customElement("publish-dialog")
export class PublishDialog extends DnaElement<FileShareDvmPerspective, FileShareDvm> {

    @state() private _file?: File;
    @state() private _selectedTags = [];

    private _splitObj?: SplitObject;

    /** -- Getters -- */


    get inputElem() : SlInput {
        return this.shadowRoot.getElementById("tag-input") as SlInput;
    }

    get dialogElem() : SlDialog {
        return this.shadowRoot.getElementById("publish-dialog-inner") as SlDialog;
    }


    get tagListElem() : TagList {
        return this.shadowRoot.getElementById("selected-tag-list") as TagList;
    }

    /** -- Methods -- */

    /** */
    open() {
        var input = document.createElement('input');
        input.type = 'file';
        input.onchange = async (e:any) => {
            if (e.target.files[0].size > this._dvm.dnaProperties.maxParcelSize) {
                toastError(`File is too big ${prettyFileSize(e.target.files[0].size)}. Maximum file size: ${prettyFileSize(this._dvm.dnaProperties.maxParcelSize)}`)
                return;
            }
            this._splitObj = await splitFile(e.target.files[0], this._dvm.dnaProperties.maxChunkSize);
            this._file = e.target.files[0];
            this.dialogElem.open = true;
        }
        input.click();
    }





    /** */
    async onAddNewPublicTag(e) {
        console.log("onAddNewPublicTag", e);
        await this._dvm.taggingZvm.addPublicTag(e.detail);
        this._selectedTags.push(e.detail);
        if (this.tagListElem) this.tagListElem.requestUpdate();
        this.requestUpdate();
    }


    /** */
    render() {
        console.log("<publish-dialog>.render()", this._file);

        const allTags = this._dvm.taggingZvm.allPublicTags
            .filter((tag) => this._selectedTags.indexOf(tag) < 0)

        /** render all */
        return html`
            <sl-dialog id="publish-dialog-inner" 
                       label='Publish "${this._file? this._file.name : ""}" ?' @sl-request-close=${e => this._file = undefined}
                       style="--width: 600px;"
            >
                <div style="margin-left:10px;">
                    <div>Size: ${prettyFileSize(this._file? this._file.size : 0)}</div>                    
                    <div>Type: ${this._file? this._file.type : ""}</div>
                    <div>Hash: ${!this._file || !this._splitObj? "" : this._splitObj.dataHash}</div>
                </div>
                
                <div style="margin-bottom: 5px; display:flex;">
                    tags: ${this._selectedTags.length == 0
                        ? html`none`
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
                           @new-tag=${(e) => {console.log("e", e); this.onAddNewPublicTag(e)}}
                           @selected=${(e) => {this._selectedTags.push(e.detail); this.requestUpdate(); if (this.tagListElem) this.tagListElem.requestUpdate();}}
                ></tag-input>
                
                <sl-button slot="footer" variant="neutral" @click=${(e) => {this._file = undefined; this.dialogElem.open = false;}}>Cancel</sl-button>
                <sl-button slot="footer" variant="primary" ?disabled=${!this._file} @click=${async (e) => {
                        const _splitObj = await this._dvm.startPublishFile(this._file, this._selectedTags);
                        this._file = undefined;         
                        this._selectedTags = [];
                        this.dialogElem.open = false;
                        this.dispatchEvent(new CustomEvent('publish-started', {detail: this._splitObj, bubbles: true, composed: true}));
                    }}>
                    Publish
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
