import {css, html, LitElement} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {dayTimestamp, prettyFileSize} from "../utils";
import {columnBodyRenderer, columnFooterRenderer, columnHeaderRenderer} from "@vaadin/grid/lit";
import {ParcelDescription} from "@ddd-qc/delivery/dist/bindings/delivery.types";
import {filesSharedStyles} from "../sharedStyles";
import {EntryId, intoDhtId, ZomeElement} from "@ddd-qc/lit-happ";
import {TaggingZvm} from "../viewModels/tagging.zvm";
import {TagList} from "./tag-list";
/** Side-effect import: the "+" popup renders one, and a type-only import
 *  would be elided, leaving <tag-input> unregistered. */
import "./tag-input";
import {kind2Icon, kind2Type} from "../fileTypeUtils";
import {getInitials} from "@ddd-qc/profiles-dvm";
/** The row actions menu needs these registered. Every other Shoelace element
 *  this table uses is registered by the host app, but sl-dropdown was not, so
 *  the menu rendered inline inside the cell and stretched the row. Register
 *  them here so the table works wherever the package is consumed. */
import "@shoelace-style/shoelace/dist/components/dropdown/dropdown.js";
import "@shoelace-style/shoelace/dist/components/menu/menu.js";
import "@shoelace-style/shoelace/dist/components/menu-item/menu-item.js";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";
import "@shoelace-style/shoelace/dist/components/avatar/avatar.js";
import {Profile as ProfileMat} from "@ddd-qc/profiles-dvm/dist/bindings/profiles.types";
import {msg} from "@lit/localize";
import {toastError} from "../toast";
import {unsafeSVG} from "lit/directives/unsafe-svg.js";
import {ADD_TO_POCKET_SVG} from "../svgIcons";
import {EntryHashB64} from "@holochain/client";
import {TaggingPerspectiveMutable} from "../viewModels/tagging.perspective";
import {Hrl} from "@theweave/api";
import {intoHrl} from "@ddd-qc/we-utils";
import {DhtId} from "@ddd-qc/cell-proxy";


/** The columns you can sort on. Tags are a set, not a value, so they are not one. */
export type SortKey = "name" | "size" | "type" | "from" | "date" | "local" | "private";


/** Don't use HolochainId directly as the vaadin will try to autoconvert to string for default rendering */
export interface FileTableItem {
    ppEh: EntryHashB64,
    description: ParcelDescription,
    timestamp: number,
    author?: ProfileMat,
    isPrivate: boolean,
    isLocal: boolean,
}


/**
 * @element
 */
@customElement("file-table")
export class FileTable extends ZomeElement<TaggingPerspectiveMutable, TaggingZvm> {

    /** */
    constructor() {
        super(TaggingZvm.DEFAULT_ZOME_NAME)
    }

    /** -- State variables -- */

    @property() items: FileTableItem[] = [];
    //@property() profiles: profiles = new AgentIdMap();

    @property() type: string = ""

    @property() selectable?: string;

    @property({type: Boolean}) view: boolean = false; // Allow Send & Delete buttons

    @property({type: Boolean}) notag: boolean = false; // Display the tag columns

    @property({type: Boolean}) nolocal: boolean = false; // Display the Local column

    @property({type: Boolean}) noselect: boolean = false; // Display the Checkbox column

    /** Newest first, which is what you want on opening a file list. */
    @state() private _sortKey: SortKey = "date";
    @state() private _sortAsc: boolean = false;
    /** The column sorted before this one, kept as the tie-breaker. It matters
     *  most for Local and Private, which have two values and would otherwise
     *  leave each group in whatever order it happened to be in, but it holds for
     *  every column: files of the same type stay in date order, and so on. */
    @state() private _prevSortKey: SortKey = "date";
    @state() private _prevSortAsc: boolean = false;


    /** */
    private onSort(key: SortKey) {
        if (this._sortKey == key) {
            this._sortAsc = !this._sortAsc;
            return;
        }
        this._prevSortKey = this._sortKey;
        this._prevSortAsc = this._sortAsc;
        this._sortKey = key;
        /** Dates read newest first, everything else A to Z. */
        this._sortAsc = key != "date";
    }


    /** */
    private compareBy(key: SortKey, a: FileTableItem, b: FileTableItem): number {
        switch (key) {
            case "name": return a.description.name.localeCompare(b.description.name);
            case "size": return a.description.size - b.description.size;
            case "type": return kind2Type(a.description.kind_info).localeCompare(kind2Type(b.description.kind_info));
            case "from": return (a.author? a.author.nickname : "").localeCompare(b.author? b.author.nickname : "");
            case "date": return a.timestamp - b.timestamp;
            case "local": return Number(a.isLocal) - Number(b.isLocal);
            case "private": return Number(a.isPrivate) - Number(b.isPrivate);
            default: return 0;
        }
    }


    /** */
    private sortedItems(): FileTableItem[] {
        const secondary = this._prevSortKey != this._sortKey? this._prevSortKey : undefined;
        return [...this.items].sort((a, b) => {
            const res = this.compareBy(this._sortKey, a, b) * (this._sortAsc? 1 : -1);
            if (res != 0 || !secondary) {
                return res;
            }
            return this.compareBy(secondary, a, b) * (this._prevSortAsc? 1 : -1);
        });
    }


    /** */
    private renderSortHeader(key: SortKey, label: string) {
        const isActive = this._sortKey == key;
        return html`
            <div class="sort-header ${isActive? "active" : ""}" @click=${() => this.onSort(key)}>
                <span>${label}</span>
                ${isActive
                        ? html`<sl-icon class="sort-icon" name=${this._sortAsc? "caret-up-fill" : "caret-down-fill"}></sl-icon>`
                        : html``}
            </div>`;
    }


    /** */
    get gridElem(): LitElement {
        return this.shadowRoot!.getElementById("grid") as LitElement;
    }


    /** Every Shoelace popup opened inside a cell -- the actions dropdown, the tag
     *  input, a tooltip -- is painted inside its row, and the virtualizer gives
     *  each row a transform, so each row is its own stacking context. No z-index
     *  on the popup can lift it out of that: rows paint in DOM order, so the rows
     *  below always cover it. Lifting the row that owns the open popup is what
     *  works, and rows are absolutely positioned so z-index applies to them
     *  directly. sl-show/sl-after-hide bubble, so one pair of listeners on the
     *  grid covers every popup in every cell. */
    private setRowZIndex(e: Event, delta: number) {
        const cellContent = (e.target as HTMLElement).closest("vaadin-grid-cell-content") as HTMLElement | null;
        const row = cellContent?.assignedSlot?.closest("tr") as HTMLElement | null;
        if (!row) {
            return;
        }
        /** Counted, not a flag: a row can have more than one popup open at a
         *  time -- hovering a tag inside an open tag panel shows its tooltip --
         *  and that tooltip closing must not drop the row back down while the
         *  panel is still up. */
        const count = Math.max(0, (Number(row.dataset["openPopups"]) || 0) + delta);
        row.dataset["openPopups"] = String(count);
        row.style.zIndex = count > 0? "1" : "";
    }


    /** Line the tag panel up with the start of the Tags column rather than with
     *  the "+", which sits at the far end of the cell. sl-dropdown always anchors
     *  to its trigger, so shift it back by the gap between the two. */
    private onAddTagShow(e: Event) {
        const dropdown = e.target as any;
        const cellContent = dropdown.closest("vaadin-grid-cell-content") as HTMLElement | null;
        const trigger = dropdown.querySelector('[slot="trigger"]') as HTMLElement | null;
        if (cellContent && trigger) {
            dropdown.skidding = -(trigger.getBoundingClientRect().left - cellContent.getBoundingClientRect().left);
        }
    }


    /** Add one personal tag to a file from the "+" in the Tags column. Group tags
     *  are not added here: those are chosen when a file is shared. */
    async onAddPersonalTag(ppEh: EntryHashB64, targetInfo: string, tag: string) {
        const eh = new EntryId(ppEh);
        if (this._zvm.perspective.getTargetPrivateTags(eh).includes(tag)) {
            return;
        }
        const dropdown = this.shadowRoot!.getElementById(`add-tag-${ppEh}`) as any;
        try {
            await this._zvm.tagPrivateEntry(eh, [tag], targetInfo);
            /** The tagging is committed on chain either way, but the perspective
             *  only picks it up if the tag's entry pulse is handled before the
             *  link pulse that references it: handleLinkPulse() drops a link
             *  whose tag it does not know yet ("Unknown Private tagEh"), which is
             *  exactly the case for a tag used for the first time. Re-reading the
             *  tag settles it. */
            await this._zvm.findPrivateEntriesWithTag(tag);
        } catch (e) {
            console.error("Tagging failed", e);
            toastError(`${msg("Could not add tag")}: ${tag}`);
        }
        if (dropdown) {
            dropdown.hide();
        }
        this.requestUpdate();
    }


    /** */
    copyMessageLink(dhtId: DhtId) {
      const hrl: Hrl = intoHrl(this.cell.address.dnaId, dhtId);
      this.dispatchEvent(new CustomEvent<Hrl>("copy", {detail: hrl, bubbles: true, composed: true}))
    }

    /** */
    override render() {
        console.log("<file-table>.render()", this.type, this.view, this.items, this._zvm.perspective);
        if (!this.items.length) {
            return html`${msg("No items found")}`;
        }

        const totalSize = this.items.reduce((accumulator, item) => accumulator + item.description.size, 0);

        // if (this.selectable == undefined) {
        //     this._selectedItems = this.items;
        // }
        // .selectedItems="${this._selectedItems}"
        // @active-item-changed="${(e: GridActiveItemChangedEvent<FileTableItem>) => {
        //     const item = e.detail.value;
        //     this._selectedItems = item ? [item] : [];
        // }}"

        /** render all */
        //return html``;
        return html`
            <vaadin-grid id="grid"
                         @sl-show=${(e: Event) => this.setRowZIndex(e, 1)}
                         @sl-after-hide=${(e: Event) => this.setRowZIndex(e, -1)}
                         .items=${this.sortedItems()}>
                <vaadin-grid-selection-column width="38px" flex-grow="0" .hidden=${this.noselect}></vaadin-grid-selection-column>
                <vaadin-grid-column path="description" ${columnHeaderRenderer(() => this.renderSortHeader("name", msg("Filename")), [this._sortKey, this._sortAsc])}
                                    ${columnBodyRenderer<FileTableItem>(
                                            ({ description }) => html`
                                                <sl-tooltip placement="bottom" content=${description.name} hoist>
                                                    <span class="filename">${description.name}</span>
                                                </sl-tooltip>`,
                                            [],
                                    )}
                                    ${/* The Total label lives on this column, right up against
                                          Size, because the Size column is too narrow for both. */
                                       columnFooterRenderer(() => html`<span class="footer-label">${msg("Total")}:</span>`, [])}
                >
                </vaadin-grid-column>
                
                <vaadin-grid-column path="description" ${columnHeaderRenderer(() => this.renderSortHeader("size", msg("Size")), [this._sortKey, this._sortAsc])} width="72px" flex-grow="0"
                                    ${columnBodyRenderer<FileTableItem>(
                                ({ description }) => html`<span>${prettyFileSize(description.size)}</span>`,
                            [],
                                    )}
                                    ${columnFooterRenderer(() => html`<span>${prettyFileSize(totalSize)}</span>`, [totalSize])}
                ></vaadin-grid-column>
                <!-- Same icon the home page uses for the type cards; the word is on hover. -->
                <vaadin-grid-column path="description" ${columnHeaderRenderer(() => this.renderSortHeader("type", msg("Type")), [this._sortKey, this._sortAsc])} width="60px" flex-grow="0"
                                    ${columnBodyRenderer<FileTableItem>(
                                            ({ description }) => html`
                                                <sl-tooltip placement="bottom" content=${kind2Type(description.kind_info)} hoist>
                                                    <sl-icon class="type-icon" name=${kind2Icon(description.kind_info)}></sl-icon>
                                                </sl-tooltip>`,
                                            [],
                                    )}
                ></vaadin-grid-column>
                    
                ${this.notag? html``: html`
                <!-- One column for both kinds of tag: two columns cost width the list
                     does not have, and the colour plus the hover text say which is
                     which. Group tags are everyone's, personal tags are only mine. -->
                <vaadin-grid-column path="ppEh" header=${msg("Tags")}
                                    ${columnBodyRenderer<FileTableItem>(
                                            ({ ppEh, description, isPrivate }) => html`
                                                <div class="tag-cell">
                                                    <tag-list kind="group"
                                                              .tags=${this._zvm.perspective.getTargetPublicTags(new EntryId(ppEh))}
                                                    ></tag-list>
                                                    <tag-list id="priv-tags-${ppEh}" kind="personal" selectable deletable
                                                              .tags=${this._zvm.perspective.getTargetPrivateTags(new EntryId(ppEh))}
                                                              @deleted=${async (e: CustomEvent<string>) => {
                                                                  await this._zvm.untagPrivateEntry(new EntryId(ppEh), e.detail);
                                                                  const tagList = this.shadowRoot!.getElementById(`priv-tags-${ppEh}`) as TagList;
                                                                  tagList.requestUpdate();
                                                              }}
                                                    ></tag-list>
                                                    <!-- The "+" had no handler at all: it has always been inert.
                                                         It now opens the same tag input the store and send dialogs
                                                         use, which offers the tags already in use and takes a new
                                                         one on Enter. -->
                                                    <!-- No tooltip on the trigger: with the panel open the
                                                         trigger is underneath it, and hovering the panel kept
                                                         waking the tooltip. The panel's own placeholder says
                                                         what it does. -->
                                                    <!-- 0.6 line: the tagging zome only accepts a personal tag
                                                         on one of my own private files (tag_private_entry checks
                                                         query_private_entry), so the "+" is offered only there. -->
                                                    ${isPrivate? html`
                                                    <sl-dropdown id="add-tag-${ppEh}" placement="bottom-start" hoist
                                                                 @sl-show=${(e: Event) => this.onAddTagShow(e)}>
                                                        <sl-icon-button slot="trigger" class="add-tag" name="plus-circle-dotted"
                                                                        label=${msg("Add a personal tag")}></sl-icon-button>
                                                        <div class="add-tag-panel">
                                                            <tag-input placeholder=${msg("Add personal tag")}
                                                                       .tags=${this._zvm.perspective.allPrivateTags}
                                                                       @new-tag=${async (e: CustomEvent<string>) => {
                                                                           e.stopPropagation();
                                                                           await this.onAddPersonalTag(ppEh, description.name, e.detail);
                                                                       }}
                                                                       @selected=${async (e: CustomEvent<string>) => {
                                                                           e.stopPropagation();
                                                                           await this.onAddPersonalTag(ppEh, description.name, e.detail);
                                                                       }}
                                                            ></tag-input>
                                                        </div>
                                                    </sl-dropdown>
                                                    `: html``}
                                                </div>
                                            `,
                                            [],
                                    )}
                ></vaadin-grid-column>
                `}
                <vaadin-grid-column path="author" ${columnHeaderRenderer(() => this.renderSortHeader("from", msg("From")), [this._sortKey, this._sortAsc])} width="60px" flex-grow="0"
                                    ${columnBodyRenderer<FileTableItem>(
                                            ({ author }) => {
                                                const nickname = author? author.nickname : msg("Unknown");
                                                const avatar = author && author.fields['avatar']? author.fields['avatar'] : "";
                                                return html`
                                                    <sl-tooltip placement="bottom" content=${nickname} hoist>
                                                        <sl-avatar class="author-avatar" label=${nickname}
                                                                   initials=${getInitials(nickname)}
                                                                   .image=${avatar}></sl-avatar>
                                                    </sl-tooltip>`;
                                            },
                                    [],
                                    )}
                ></vaadin-grid-column>
                <vaadin-grid-column path="timestamp" ${columnHeaderRenderer(() => this.renderSortHeader("date", msg("Date")), [this._sortKey, this._sortAsc])} width="100px" flex-grow="0"
                                    ${columnBodyRenderer<FileTableItem>(
                                            ({ timestamp }) => html`<span>${dayTimestamp(timestamp)}</span>`,
                                            [],
                                    )}
                ></vaadin-grid-column>
                <vaadin-grid-column path="isLocal" ${columnHeaderRenderer(() => this.renderSortHeader("local", msg("Local")), [this._sortKey, this._sortAsc])} width="58px" flex-grow="0"
                                    .hidden=${this.type == "personal" || this.nolocal}
                                    ${columnBodyRenderer<FileTableItem>(
                                            ({ isLocal }) => html`<span>${isLocal? msg("Yes") : msg("No")}</span>`,
                                            [],
                                    )}
                ></vaadin-grid-column>
                <vaadin-grid-column path="isPrivate" ${columnHeaderRenderer(() => this.renderSortHeader("private", msg("Private")), [this._sortKey, this._sortAsc])} width="64px" flex-grow="0"
                                    .hidden=${this.type == "group" || this.type == "personal"}
                                    ${columnBodyRenderer<FileTableItem>(
                                            ({ isPrivate }) => html`<span>${isPrivate? msg("Yes") : msg("No")}</span>`,
                                            [],
                                    )}
                ></vaadin-grid-column>
                <vaadin-grid-column
                        path="ppEh" header="" width="52px" flex-grow="0" style="text-overflow: clip;"
                        ${columnBodyRenderer<FileTableItem>(
                                ({ppEh}) => {
                                    if (this.selectable == "") {
                                        return html`
                                            <sl-tooltip placement="bottom" content=${msg("Select")} hoist>
                                              <sl-button size="small" variant="primary"
                                                         @click=${async (_e:any) => {
                                                             this.dispatchEvent(new CustomEvent<EntryId>('selected', {
                                                                 detail: new EntryId(ppEh),
                                                                 bubbles: true,
                                                                 composed: true
                                                             }));
                                                         }}>
                                                  <sl-icon name="check2-square"></sl-icon>
                                              </sl-button>
                                            </sl-tooltip>
                                        `;
                                    } else {
                                        // TODO: Optimize. Should have a better way to get the item here instead of doing a search for each item.
                                        const item = this.items.filter((item) => item.ppEh == ppEh);
                                        const isPublic = item.length > 0 && !item[0]!.isPrivate;
                                        //console.log("isPublic", isPublic, item, ppEh)
                                        /** All row actions live behind one menu. Previously these were
                                         *  individual buttons, some shown or hidden depending on state,
                                         *  which made the column wide and its width inconsistent between
                                         *  rows. One trigger is a fixed, predictable width. */
                                        return html`
                                            <sl-dropdown placement="bottom-end" hoist>
                                              <sl-icon-button slot="trigger" name="three-dots" label=${msg("Actions")}></sl-icon-button>
                                              <sl-menu @sl-select=${(e:any) => {
                                                  const value = e.detail.item.value;
                                                  const id = new EntryId(ppEh);
                                                  switch (value) {
                                                      case "download":
                                                          this.dispatchEvent(new CustomEvent<EntryId>('download', {detail: id, bubbles: true, composed: true}));
                                                          break;
                                                      case "send":
                                                          this.dispatchEvent(new CustomEvent<EntryId>('send', {detail: id, bubbles: true, composed: true}));
                                                          break;
                                                      case "pocket":
                                                          this.copyMessageLink(intoDhtId(ppEh));
                                                          break;
                                                      case "view":
                                                          this.dispatchEvent(new CustomEvent<EntryId>('view', {detail: id, bubbles: true, composed: true}));
                                                          break;
                                                  }
                                              }}>
                                                <sl-menu-item value="download">
                                                    <sl-icon slot="prefix" name="download"></sl-icon>
                                                    ${msg("Download")}
                                                </sl-menu-item>
                                                ${!isPublic && !this.view? html`
                                                <sl-menu-item value="send">
                                                    <sl-icon slot="prefix" name="send"></sl-icon>
                                                    ${msg("Send")}
                                                </sl-menu-item>` : html``}
                                                <sl-menu-item value="pocket">
                                                    <span slot="prefix" class="pocket-icon">${unsafeSVG(ADD_TO_POCKET_SVG)}</span>
                                                    ${msg("Add to Pocket")}
                                                </sl-menu-item>
                                                <sl-menu-item value="view">
                                                    <sl-icon slot="prefix" name="info-lg"></sl-icon>
                                                    ${msg("File Info")}
                                                </sl-menu-item>
                                              </sl-menu>
                                            </sl-dropdown>
                                        `
                                    }
                                },
                                []
                        )}
                        ${columnFooterRenderer(() => html`<span>${this.items.length} ${msg("files")}</span>`, [this.items])}
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
                /* Let the host shrink below the grid's column total; the grid
                   scrolls horizontally on its own, the page must not. */
                min-width: 0;
                padding-bottom: 10px;
                padding-right: 10px;                
              }
              #grid {
                height: 100%;
                /* The horizontal scrollbar was only grabbable on its last pixel:
                   the grid's own bottom edge sat over it. Reserving the gutter
                   gives the scrollbar its full height as a hit target. */
                scrollbar-gutter: stable;
              }
              /* Vaadin pads the slotted content element, not the cell part, so
                 ::part(cell) padding has no effect here. The default 16px each
                 side across this many columns is what forced the horizontal
                 scrollbar and ellipsised the headers. */
              vaadin-grid-cell-content {
                padding: 4px 6px;
              }
              /* Truncation is what the tooltip is for; without this the cell would
                 widen to the longest name instead. */
              .filename {
                display: block;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
              .footer-label {
                display: block;
                text-align: right;
              }
              .sort-header {
                display: flex;
                align-items: center;
                gap: 2px;
                cursor: pointer;
                user-select: none;
              }
              .sort-header.active {
                font-weight: 700;
                color: #0d5897;
              }
              .sort-icon {
                font-size: 0.8rem;
              }
              .type-icon {
                font-size: 1.2rem;
                vertical-align: middle;
              }
              .author-avatar {
                --size: 24px;
                cursor: default;
              }
              /* Without align-items the tag-lists stretched to the height of the
                 "+" button and the pills grew with them. */
              .tag-cell {
                display: flex;
                align-items: center;
                gap: 5px;
              }
              /* tag-list carries a top margin for the dialogs it also appears in. */
              .tag-cell tag-list {
                margin-top: 0px;
              }
              .add-tag {
                font-size: 1.0rem;
              }
              .add-tag-panel {
                padding: 8px;
                background: rgb(24, 24, 24);
                border-radius: 8px;
                box-shadow: rgba(0, 0, 0, 0.3) 0px 9px 18px, rgba(0, 0, 0, 0.22) 0px 7px 6px;
              }
              /* The pocket artwork is an inline SVG rather than an sl-icon, so it
                 needs the sizing, centring and colour that sl-icon would give it.
                 currentColor makes it follow the button's text colour (white on
                 the filled variants) instead of the black baked into the source. */
              .pocket-icon {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                line-height: 0;
                color: currentColor;
              }
              .pocket-icon svg {
                width: 1.1rem;
                height: 1.1rem;
                display: block;
                fill: currentColor;
              }
            `
        ];
    }
}
