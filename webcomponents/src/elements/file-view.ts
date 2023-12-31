import {css, html, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {
    decodeHashFromBase64,
    EntryHashB64,
} from "@holochain/client";
import {FilesDvm} from "../viewModels/files.dvm";
import {ParcelKindVariantManifest, ParcelManifest} from "@ddd-qc/delivery";
import {filesSharedStyles} from "../sharedStyles";
import {FilesDvmPerspective} from "../viewModels/files.perspective";
import {msg} from "@lit/localize";
import {prettyFileSize} from "../utils";


/**
 * @element
 */
@customElement("file-view")
export class FileView extends DnaElement<FilesDvmPerspective, FilesDvm> {

    /** -- Properties -- */

    /** Hash of ParcelManifest to display */
    @property() hash: EntryHashB64 = ''

    /** Enable action bar */
    @property() showActionBar: boolean = true

    /** Observed perspective from zvm */
    // @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
    // filesPerspective!: FileSharePerspective;

    /** -- State variables -- */

    @state() private _loading = true;
    @state() private _manifest?: ParcelManifest;


    /** -- Methods -- */


    /** FOR DEBUGGING */
    shouldUpdate(changedProperties: PropertyValues<this>) {
        console.log("<file-view>.shouldUpdate()", changedProperties, this._dvm);
        if (changedProperties.has("_cell_via_context")) {
            this._cell = this._cell_via_context;
        }
        if (!this._dvm) {
            this.requestDvm();
        }
        return !!this._dvm;
    }


    /** */
    protected async willUpdate(changedProperties: PropertyValues<this>) {
        super.willUpdate(changedProperties);
        console.log("<file-view>.loadMessages()", changedProperties, !!this._dvm, this.hash);
        if (this._dvm && (changedProperties.has("hash") || (!this._manifest && this.hash))) {
            console.log("<file-view>.willUpdate()", this.hash);
            this._manifest = await this._dvm.filesZvm.zomeProxy.getFileInfo(decodeHashFromBase64(this.hash));
        }
    }


    /** */
    render() {
        console.log("<file-view>.render()", this.hash);
        if (this.hash == "") {
            return html`
                <div style="color:#c10a0a">${msg("No file selected")}</div>`;
        }
        if (!this._manifest) {
            return html`
                <div style="color:#c10a0a">${msg("File not found")}</div>`;
        }

        /** render all */
        return html`
            <h4 style="margin-left: 5px;">${this._manifest.description.name}</h4>
            <div>Size: ${prettyFileSize(this._manifest.description.size)}</div>
            <div style="padding-bottom: 10px;">type: ${(this._manifest.description.kind_info as ParcelKindVariantManifest).Manifest}</div>
            ${this.showActionBar
                    ? html`<input type="button" value="Download" @click=${(e) => {this._dvm.downloadFile(this.hash)}}>`
                    : html``
            }
        `;
    }

    /** */
    static get styles() {
        return [
            filesSharedStyles,
        ];
    }
}
