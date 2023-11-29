import {css, html, LitElement} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {
    ActionHashB64,
    AgentPubKeyB64,
    EntryHashB64,
} from "@holochain/client";
import {prettyFileSize, prettyTimestamp} from "../utils";
import {columnBodyRenderer, columnFooterRenderer} from "@vaadin/grid/lit";
import {DeliveryStateType, ParcelDescription} from "@ddd-qc/delivery/dist/bindings/delivery.types";
import {filesSharedStyles} from "../sharedStyles";
import {kind2Type} from "../fileTypeUtils";
import {Profile as ProfileMat} from "@ddd-qc/profiles-dvm";

export interface DistributionTableItem {
    distribAh: ActionHashB64,
    recipient: AgentPubKeyB64,
    deliveryState: DeliveryStateType,
    ppEh: EntryHashB64,
    description: ParcelDescription,
    sentTs: number,
    receptionTs: number,
}


/**
 * @element
 */
@customElement("distribution-table")
export class DistributionTable extends LitElement {

    /** -- State variables -- */

    @property() items: DistributionTableItem[] = [];
    @property() profiles: Record<AgentPubKeyB64, ProfileMat> = {};

    /** */
    render() {
        console.log("<distribution-table>.render()", this.items);
        // if (!this.items.length) {
        //     return html`No items found`;
        // }

        const totalSize = this.items.reduce((accumulator, item) => accumulator + item.description.size, 0);

        /** render all */
        return html`
            <vaadin-grid .items="${this.items}">
                <vaadin-grid-selection-column></vaadin-grid-selection-column>
                <vaadin-grid-column path="deliveryState" header=""
                                    ${columnBodyRenderer(
                                            ({ deliveryState }) => html`<span>${deliveryState}</span>`,
                                            [],
                                    )}>
                </vaadin-grid-column>                
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
                                            ({ description }) => html`<span>${kind2Type(description.kind_info)}</span>`,
                                            [],
                                    )}
                ></vaadin-grid-column>
                <vaadin-grid-column path="recipient" header="Recipient"
                                    ${columnBodyRenderer(
                                            ({ recipient }) => {
                                                const maybeProfile = this.profiles[recipient];
                                                return maybeProfile
                                                        ? html`<span>${maybeProfile.nickname}</span>`
                                                        : html`<span>Unknown</span>`
                                            },
                                    [],
                                    )}
                ></vaadin-grid-column>
                <vaadin-grid-column path="sentTs" header="Sent Date"
                                    ${columnBodyRenderer(
                                            ({ sentTs }) => html`<span>${prettyTimestamp(sentTs)}</span>`,
                                            [],
                                    )}
                ></vaadin-grid-column>
                <vaadin-grid-column path="receptionTs" header="Received Date"
                                    ${columnBodyRenderer(
                                            ({ receptionTs }) => html`<span>${prettyTimestamp(receptionTs)}</span>`,
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
            filesSharedStyles,
        ];
    }
}
