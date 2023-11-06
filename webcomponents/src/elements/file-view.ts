import {css, html, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {
    decodeHashFromBase64,
    EntryHashB64,
} from "@holochain/client";
import {consume} from "@lit-labs/context";
import {FilesDvm} from "../viewModels/files.dvm";
import {globalProfilesContext} from "../contexts";
import {ParcelKindVariantManifest} from "@ddd-qc/delivery";
import {sharedStyles} from "../sharedStyles";
import {ProfilesZvm} from "@ddd-qc/profiles-dvm";
import {FilesDvmPerspective} from "../viewModels/files.perspective";


/**
 * @element
 */
@customElement("file-view")
export class FileView extends DnaElement<FilesDvmPerspective, FilesDvm> {

    @consume({context: globalProfilesContext, subscribe: true})
    _profilesZvm!: ProfilesZvm;

    /** -- Properties -- */

    /** Hash of ParcelManifest to display */
    @property() hash: EntryHashB64 = ''

    /** Enable action bar */
    @property() showActionBar: boolean = false

    /** Observed perspective from zvm */
    // @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
    // fileSharePerspective!: FileSharePerspective;

    /** -- State variables -- */

    @state() private _loading = true;
    @state() private _manifest?;


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
        if (changedProperties.has("hash") && this._dvm) {
            console.log("<file-view>.willUpdate()", this.hash);
            this._manifest = await this._dvm.fileShareZvm.zomeProxy.getFileInfo(decodeHashFromBase64(this.hash));
        }
    }

    /** */
    render() {
        console.log("<file-view>.render()", this.hash);
        if (this.hash == "") {
            return html`
                <div style="color:#c10a0a">No file selected</div>`;
        }
        if (!this._manifest) {
            return html`
                <div style="color:#c10a0a">File not found</div>`;
        }

        /** render all */
        return html`
            <h4 style="margin-left: 5px;">${this._manifest.description.name}</h4>
            <div>Size: ${this._manifest.description.size} bytes</div>
            <div>type: ${(this._manifest.description.kind_info as ParcelKindVariantManifest).Manifest}</div>
            ${this.showActionBar
                    ? html`<input type="button" value="Download">`
                    : html``
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
