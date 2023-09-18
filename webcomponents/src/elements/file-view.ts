import {css, html, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {Dictionary} from "@ddd-qc/cell-proxy";
import {
    ActionHashB64,
    decodeHashFromBase64,
    DnaHashB64,
    encodeHashToBase64,
    EntryHashB64,
} from "@holochain/client";
import {
    AppletInfo,
    Hrl,
    WeServices, weServicesContext,
} from "@lightningrodlabs/we-applet";
import {consume} from "@lit-labs/context";

import {FileShareDvm} from "../viewModels/fileShare.dvm";
import {FileShareProfile} from "../viewModels/profiles.proxy";
import {ProfilesZvm} from "../viewModels/profiles.zvm";
import {globalProfilesContext} from "../viewModels/happDef";
import {emptyAppletId, getInitials} from "../utils";
import {FileSharePerspective} from "../viewModels/fileShare.zvm";
import {ParcelKindVariantManifest} from "@ddd-qc/delivery/dist/bindings/delivery.types";


/**
 * @element
 */
@customElement("file-view")
export class FileView extends DnaElement<unknown, FileShareDvm> {

    constructor() {
        super(FileShareDvm.DEFAULT_BASE_ROLE_NAME);
        console.log("<comment-thread-view>.ctor()", this.hash)
    }

    @consume({context: globalProfilesContext, subscribe: true})
    _profilesZvm!: ProfilesZvm;

    /** -- Properties -- */

    /** Hash of Thread to display */
    @property() hash: ActionHashB64 = ''

    /** Enable action bar */
    @property() showActionBar: boolean = false

    /** Observed perspective from zvm */
    @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
    fileSharePerspective!: FileSharePerspective;

    /** -- State variables -- */

    @state() private _loading = false;


    /** -- Methods -- */

    /**
     * In dvmUpdated() this._dvm is not already set!
     * Subscribe to fileShareZvm
     */
    protected async dvmUpdated(newDvm: FileShareDvm, oldDvm?: FileShareDvm): Promise<void> {
        console.log("<file-view>.dvmUpdated()");
        if (oldDvm) {
            console.log("\t Unsubscribed to fileShareZvm's roleName = ", oldDvm.fileShareZvm.cell.name)
            oldDvm.fileShareZvm.unsubscribe(this);
        }
        newDvm.fileShareZvm.subscribe(this, 'fileSharePerspective');
        console.log("\t Subscribed fileShareZvm's roleName = ", newDvm.fileShareZvm.cell.name)
        newDvm.fileShareZvm.probeAll();
    }


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
            this._dvm.fileShareZvm.probeAll();
        }
    }

    /** */
    render() {
        console.log("<file-view>.render()", this.hash);
        if (this.hash == "") {
            return html`
                <div style="color:#c10a0a">No file selected</div>`;
        }
        const manifest = this.fileSharePerspective.privateFiles[this.hash];
        if (!manifest) {
            return html`<div style="color:#c10a0a">File not found</div>`;
        }

        /** render all */
        return html`
            <h4 style="margin-left: 5px;">${manifest.description.name}</h4>
            <div>Size: ${manifest.description.size} bytes</div>
            <div>type: ${(manifest.description.kind_info as ParcelKindVariantManifest).Manifest}</div>
            ${this.showActionBar
                    ? html`<input type="button" value="Download">`
                    : html``
            }
        `;
    }

}
