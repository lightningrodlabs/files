import {css, html, LitElement} from "lit";
import {customElement} from "lit/decorators.js";
import {dayTimestamp} from "../utils";
import {columnBodyRenderer} from "@vaadin/grid/lit";
import {NoticeState} from "@ddd-qc/delivery/dist/bindings/delivery.types";
import {filesSharedStyles} from "../sharedStyles";
import {AgentId, ZomeElement} from "@ddd-qc/lit-happ";
import {msg} from "@lit/localize";
import {AgentPubKeyB64, EntryHashB64} from "@holochain/client";
import {DeliveryPerspective, DeliveryZvm} from "@ddd-qc/delivery";


/** Don't use HolochainId directly as the vaadin will try to autoconvert to string for default rendering */
export interface NoticeTableItem {
    noticeEh: EntryHashB64,
    parcelName: string,
    timestamp: number,
    sender: AgentPubKeyB64,
    state: NoticeState,
    missingChunkCount: number,
}


/**
 * @element
 */
@customElement("notice-table")
export class NoticeTable extends ZomeElement<DeliveryPerspective, DeliveryZvm> {

  /** */
  constructor() {
    super(DeliveryZvm.DEFAULT_ZOME_NAME)
  }


  /** */
  get gridElem(): LitElement {
      return this.shadowRoot!.getElementById("grid") as LitElement;
  }



  /** */
  override render() {
      console.log("<notice-table>.render()", this.perspective.notices);
      if (!this.perspective.notices.size) {
          return html`${msg("No notices found")}`;
      }

      const items = Array.from(this.perspective.notices.entries()).map(([noticeEh, [notice, timestamp, state, missingChunks]]) => {
          return {
            noticeEh: noticeEh.b64,
            parcelName: notice.summary.parcel_reference.description.name,
            timestamp,
            sender: new AgentId(notice.sender).b64,
            state,
            missingChunkCount: missingChunks.size,
          } as NoticeTableItem;
      });

      //const totalSize = items.reduce((accumulator, item) => accumulator + item.missingChunkCount, 0);


      /** render all */
      return html`
          <vaadin-grid id="grid" .items=${items}>
              <vaadin-grid-selection-column></vaadin-grid-selection-column>
              <vaadin-grid-column path="noticeEh" header=${msg("Notice")}
                                  ${columnBodyRenderer<NoticeTableItem>(
                                          ({ noticeEh }) => html`<span>${noticeEh}</span>`,
                                          [],
                                  )}>
              </vaadin-grid-column>
              <vaadin-grid-column path="parcelName" header=${msg("Parcel")}
                                  ${columnBodyRenderer<NoticeTableItem>(
                                          ({ parcelName }) => html`<span>${parcelName}</span>`,
                                          [],
                                  )}>
              </vaadin-grid-column>              
              <vaadin-grid-column path="state" header=${msg("State")}
                                  ${columnBodyRenderer<NoticeTableItem>(
                                          ({ state }) => html`<span>${state}</span>`,
                                          [],
                                  )}
              ></vaadin-grid-column>
              
              <vaadin-grid-column path="sender" header=${msg("Sent by")}
                                  ${columnBodyRenderer<NoticeTableItem>(
                                          ({ sender }) => {
                                              return html`<span>${sender}</span>`
                                          },
                                  [],
                                  )}
              ></vaadin-grid-column>
              <vaadin-grid-column path="timestamp" header=${msg("Date")}
                                  ${columnBodyRenderer<NoticeTableItem>(
                                          ({ timestamp }) => html`<span>${dayTimestamp(timestamp)}</span>`,
                                          [],
                                  )}
              ></vaadin-grid-column>
          </vaadin-grid>
      `;
  }


  /** */
  static override get styles() {
      return [
          filesSharedStyles,
          css`
            :host {
              flex: 1 1 auto;
              padding-bottom: 10px;
              padding-right: 10px;                
            }
            #grid {
              height: 100%;
            }
            .add-tag {
              font-size: 1.0rem;
            }
          `
      ];
  }
}
