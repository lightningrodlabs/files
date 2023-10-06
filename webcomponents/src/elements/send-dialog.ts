import {css, html, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {FileShareDvm} from "../viewModels/fileShare.dvm";
import {sharedStyles} from "../sharedStyles";
import {FileShareDvmPerspective} from "../viewModels/fileShare.perspective";
import {SlDialog, SlSelect} from "@shoelace-style/shoelace";
import {arrayBufferToBase64, prettyFileSize, splitData, splitFile, SplitObject} from "../utils";
import {toastError} from "../toast";
import {AgentPubKeyB64} from "@holochain/client";
import {consume} from "@lit-labs/context";
import {globalProfilesContext} from "../viewModels/happDef";
import {ProfilesZvm} from "../viewModels/profiles.zvm";


/**
 * @element
 */
@customElement("send-dialog")
export class SendDialog extends DnaElement<FileShareDvmPerspective, FileShareDvm> {

    @state() private _recipient?: AgentPubKeyB64;
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
        console.log("<send-dialog>.render()", this._file);

        const agentOptions = Object.entries(this._profilesZvm.perspective.profiles).map(
            ([agentIdB64, profile]) => {
                //console.log("" + index + ". " + agentIdB64)
                if (agentIdB64 == this.cell.agentPubKey) return html``;
                return html `<option value="${agentIdB64}">${profile.nickname}</option>`
            }
        )

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
                to: <select id="recipientSelector">${agentOptions}</select>
                <sl-button slot="footer" variant="neutral" @click=${(e) => {this._file = undefined; this.dialogElem.open = false;}}>Cancel</sl-button>
                <sl-button slot="footer" variant="primary" ?disabled=${!this._file} @click=${async (e) => {
                        this.dispatchEvent(new CustomEvent('sendStarted', {detail: {splitObj: this._splitObj, recipient: this.recipientElem.value}, bubbles: true, composed: true}));
                        const splitObject = await this._dvm.startCommitPrivateFile(this._file);
                        this._file = undefined;                    
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
        ];
    }
}
