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



/**
 * @element
 */
@customElement("publish-dialog")
export class PublishDialog extends DnaElement<FileShareDvmPerspective, FileShareDvm> {

    @state() private _file?: File;
    private _splitObj?: SplitObject;

    /** -- Getters -- */

    get dialogElem() : SlDialog {
        return this.shadowRoot.getElementById("publish-dialog-inner") as SlDialog;
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


    @state() private _selectedTags = [];

    get inputElem() : SlInput {
        return this.shadowRoot.getElementById("tag-input") as SlInput;
    }


    async onAddTag(e) {
        console.log("tag sl-change", this.inputElem.value);
        await this._dvm.taggingZvm.addPublicTag(this.inputElem.value);
        this.inputElem.value = "";
        this.requestUpdate();
    }

    /** */
    render() {
        console.log("<publish-dialog>.render()", this._file);

        const allTags = this._dvm.taggingZvm.allPublicTags.map((tag) => { return {value: tag};})
        console.log("allTags", allTags);

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
                <sl-button slot="footer" variant="primary" ?disabled=${!this._file} @click=${async (e) => {
                        const _splitObj = await this._dvm.startPublishFile(this._file, this._selectedTags.map((item) => item.value));
                        this._file = undefined;                    
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
