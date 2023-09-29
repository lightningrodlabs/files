import {css, html, LitElement, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {
    ActionHashB64,
    decodeHashFromBase64,
    DnaHashB64,
    encodeHashToBase64,
    EntryHashB64,
} from "@holochain/client";
import {consume} from "@lit-labs/context";
import {
    AppletInfo,
    Hrl,
    WeServices, weServicesContext,
} from "@lightningrodlabs/we-applet";
import {FileShareDvm} from "../viewModels/fileShare.dvm";
import {FileShareProfile} from "../viewModels/profiles.proxy";
import {ProfilesZvm} from "../viewModels/profiles.zvm";
import {globalProfilesContext} from "../viewModels/happDef";
import {base64ToArrayBuffer, emptyAppletHash, getInitials, prettyFileSize, prettyFiletype} from "../utils";
import {FileSharePerspective} from "../viewModels/fileShare.zvm";
import {ParcelDescription, ParcelKindVariantManifest, ParcelReference} from "@ddd-qc/delivery";
import {FileShareDvmPerspective} from "../viewModels/fileShare.perspective";
import {columnBodyRenderer, columnFooterRenderer, GridColumnBodyLitRenderer} from "@vaadin/grid/lit";
import {GridItemModel} from "@vaadin/grid/src/vaadin-grid";

/**
 * @element
 */
@customElement("file-table")
export class FileTable extends LitElement {

    /** -- State variables -- */

    @state() private _loading = true;

    @property() items: ParcelReference[] = [];


    /** */
    onDownload(manifestEh: EntryHashB64): void {
        this.dispatchEvent(new CustomEvent('download', {detail: manifestEh, bubbles: true, composed: true}));
    }

    /** */
    render() {
        console.log("<file-table>.render()", this.items);

        const totalSize = this.items.reduce((accumulator, pr) => accumulator + pr.description.size, 0);

        /** render all */
        return html`
            <vaadin-grid .items="${this.items}">
                <vaadin-grid-selection-column></vaadin-grid-selection-column>
                <vaadin-grid-column path="description" header="Filename"
                                    ${columnBodyRenderer(
                                            ({ description }) => html`<span>${description.name}</span>`,
                                            [],
                                    )}>
                </vaadin-grid-column>
                <vaadin-grid-column path="description" header="Size"
                                    ${columnBodyRenderer(
                                ({ description }) => html`<span>${prettyFileSize(description.size)}</span>`,
                            [],
                                    )}
                                    ${columnFooterRenderer(() => html`<span>${prettyFileSize(totalSize)} total</span>`, [totalSize])}
                ></vaadin-grid-column>
                <vaadin-grid-column path="description" header="Type"
                                    ${columnBodyRenderer(
                                            ({ description }) => html`<span>${prettyFiletype(description.kind_info)}</span>`,
                                            [],
                                    )}
                ></vaadin-grid-column>
                <vaadin-grid-column
                        path="eh" header=""
                        ${columnBodyRenderer(
                                ({eh}) => html`<vaadin-button theme="tertiary-inline" style="cursor: pointer;" @click=${(e) => {this.onDownload(eh)}}>Download</vaadin-button>`,
                                []
                        )}
                        ${columnFooterRenderer(() => html`<span>${this.items.length} files</span>`, [this.items])}
                ></vaadin-grid-column>                
            </vaadin-grid>            
        `;
    }
}
