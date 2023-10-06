import {css, html, LitElement} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {
    AgentPubKeyB64, encodeHashToBase64,
    EntryHash,
    EntryHashB64,
} from "@holochain/client";
import {prettyFileSize, prettyFiletype, prettyTimestamp} from "../utils";
import {ParcelReference} from "@ddd-qc/delivery";
import {columnBodyRenderer, columnFooterRenderer} from "@vaadin/grid/lit";
import {ParcelDescription} from "@ddd-qc/delivery/dist/bindings/delivery.types";
import {consume} from "@lit-labs/context";
import {globalProfilesContext} from "../viewModels/happDef";
import {ProfilesZvm} from "../viewModels/profiles.zvm";
import {prettyDate} from "@ddd-qc/cell-proxy";
import {sharedStyles} from "../sharedStyles";


export interface FileTableItem {
    pp_eh: EntryHash,
    description: ParcelDescription,
    timestamp: number,
    author: AgentPubKeyB64,
    isPrivate: boolean,
    isLocal: boolean,
}


/**
 * @element
 */
@customElement("file-table")
export class FileTable extends LitElement {

    /** -- State variables -- */

    @property() items: FileTableItem[] = [];

    @consume({ context: globalProfilesContext, subscribe: true })
    _profilesZvm!: ProfilesZvm;

    /** */
    onDownload(manifestEh: EntryHashB64): void {
        this.dispatchEvent(new CustomEvent('download', {detail: manifestEh, bubbles: true, composed: true}));
    }

    /** */
    render() {
        console.log("<file-table>.render()", this.items);
        if (!this._profilesZvm) {
            return html`<sl-spinner class="missing-profiles"></sl-spinner>`;
        }
        if (!this.items.length) {
            return html`No items found`;
        }

        const totalSize = this.items.reduce((accumulator, item) => accumulator + item.description.size, 0);

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
                <vaadin-grid-column path="author" header="Author" .hidden="${!this.items[0].author}"
                                    ${columnBodyRenderer(
                                            ({ author }) => {
                                                const maybeProfile = this._profilesZvm.perspective.profiles[author];
                                                return maybeProfile
                                                        ? html`<span>${maybeProfile.nickname}</span>`
                                                        : html`<sl-skeleton effect="sheen"></sl-skeleton>`
                                            },
                                    [],
                                    )}
                ></vaadin-grid-column>
                <vaadin-grid-column path="timestamp" header="Date"
                                    ${columnBodyRenderer(
                                            ({ timestamp }) => html`<span>${prettyTimestamp(timestamp)}</span>`,
                                            [],
                                    )}
                ></vaadin-grid-column>
                <vaadin-grid-column path="isLocal" header="Local" .hidden="${!("isLocal" in this.items[0])}"
                                    ${columnBodyRenderer(
                                            ({ isLocal }) => html`<span>${isLocal? "Yes" : "No"}</span>`,
                                            [],
                                    )}
                ></vaadin-grid-column>
                <vaadin-grid-column path="isPrivate" header="Private" .hidden="${!("isPrivate" in this.items[0])}"
                                    ${columnBodyRenderer(
                                            ({ isPrivate }) => html`<span>${isPrivate? "Yes" : "No"}</span>`,
                                            [],
                                    )}
                ></vaadin-grid-column>
                <vaadin-grid-column
                        path="pp_eh" header=""
                        ${columnBodyRenderer(
                                ({pp_eh}) => html`<vaadin-button theme="tertiary-inline" style="cursor: pointer;" @click=${(e) => {this.onDownload(encodeHashToBase64(pp_eh))}}>Download</vaadin-button>`,
                                []
                        )}
                        ${columnFooterRenderer(() => html`<span>${this.items.length} files</span>`, [this.items])}
                ></vaadin-grid-column>                
            </vaadin-grid>            
        `;
    }


    /** */
    static get styles() {
        return [
            sharedStyles,
        ];
    }
}
