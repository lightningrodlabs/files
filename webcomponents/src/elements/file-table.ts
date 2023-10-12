import {css, html, LitElement} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {
    AgentPubKeyB64, encodeHashToBase64,
    EntryHash,
    EntryHashB64,
} from "@holochain/client";
import {prettyFileSize, prettyFiletype, prettyTimestamp} from "../utils";
import {columnBodyRenderer, columnFooterRenderer} from "@vaadin/grid/lit";
import {ParcelDescription} from "@ddd-qc/delivery/dist/bindings/delivery.types";
import {consume} from "@lit-labs/context";
import {globalProfilesContext} from "../viewModels/happDef";
import {ProfilesZvm} from "../viewModels/profiles.zvm";
import {sharedStyles} from "../sharedStyles";


export interface FileTableItem {
    ppEh: EntryHashB64,
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
                <vaadin-grid-column path="ppEh" header="Group Tags"
                                    ${columnBodyRenderer(
                                            ({ ppEh }) => html`<tag-list .hash=${ppEh}></tag-list>`,
                                            [],
                                    )}
                ></vaadin-grid-column>
                <vaadin-grid-column path="ppEh" header="Personal Tags"
                                    ${columnBodyRenderer(
                                            ({ ppEh }) => html`
                                                <div style="display:flex">
                                                    <tag-list .hash=${ppEh} isPrivate=${true}></tag-list>
                                                    <sl-icon-button class="add-tag" name="plus-circle-dotted" label="add"></sl-icon-button>
                                                </div>
                                            `,
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
                        path="ppEh" header=""
                        ${columnBodyRenderer(
                                ({ppEh}) => {
                                    return html`
                                        <sl-button size="small" variant="primary" style="margin-left:5px" @click=${async (e) => {
                                            this.dispatchEvent(new CustomEvent('download', {detail: ppEh, bubbles: true, composed: true}));
                                        }}>
                                            <sl-icon name="download"></sl-icon>
                                        </sl-button>
                                        <sl-button size="small" variant="primary" @click=${async (e) => {
                                            this.dispatchEvent(new CustomEvent('send', {detail: ppEh, bubbles: true, composed: true}));
                                        }}>
                                            <sl-icon name="send"></sl-icon>
                                        </sl-button>
                                    `
                                },
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
            css`
            .add-tag {
              font-size: 1.0rem;
            }
            `
        ];
    }
}
