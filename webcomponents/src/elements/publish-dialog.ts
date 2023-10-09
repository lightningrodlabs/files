import {css, html, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {FileShareDvm} from "../viewModels/fileShare.dvm";
import {sharedStyles} from "../sharedStyles";
import {FileShareDvmPerspective} from "../viewModels/fileShare.perspective";
import {SlDialog} from "@shoelace-style/shoelace";
import {prettyFileSize, splitFile, SplitObject} from "../utils";
import {toastError} from "../toast";


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


    /** */
    render() {
        console.log("<publish-dialog>.render()", this._file);

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
                <sl-button slot="footer" variant="neutral" @click=${(e) => {this._file = undefined; this.dialogElem.open = false;}}>Cancel</sl-button>
                <sl-button slot="footer" variant="primary" ?disabled=${!this._file} @click=${async (e) => {
                        this.dispatchEvent(new CustomEvent('publish-started', {detail: this._splitObj, bubbles: true, composed: true}));
                        const _splitObj = await this._dvm.startPublishFile(this._file);
                        this._file = undefined;                    
                        this.dialogElem.open = false;
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
        ];
    }
}
