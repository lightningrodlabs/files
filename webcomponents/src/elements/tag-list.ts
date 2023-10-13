import {css, html, LitElement, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {sharedStyles} from "../sharedStyles";
import {DnaElement} from "@ddd-qc/lit-happ";
import {FileShareDvmPerspective} from "../viewModels/fileShare.perspective";
import {FileShareDvm} from "../viewModels/fileShare.dvm";
import {EntryHashB64} from "@holochain/client";
import {DeliveryPerspective} from "@ddd-qc/delivery";
import {TaggingPerspective} from "../viewModels/tagging.zvm";


/**
 * @element
 */
@customElement('tag-list')
export class TagList extends DnaElement<FileShareDvmPerspective, FileShareDvm> {

    /** */
    @property() hash?: EntryHashB64;
    @property() private?: string;
    @property() tags?: string[];
    @property() clickable?: string;


    /** Observed perspective from zvm */
    @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
    taggingPerspective!: TaggingPerspective;


    /**
     * In dvmUpdated() this._dvm is not already set!
     * Subscribe to ZVMs
     */
    protected async dvmUpdated(newDvm: FileShareDvm, oldDvm?: FileShareDvm): Promise<void> {
        console.log("<file-view>.dvmUpdated()");
        if (oldDvm) {
            console.log("\t Unsubscribed to Zvms roleName = ", oldDvm.taggingZvm.cell.name)
            oldDvm.taggingZvm.unsubscribe(this);
        }
        newDvm.taggingZvm.subscribe(this, 'taggingPerspective');
        console.log("\t Subscribed Zvms roleName = ", newDvm.taggingZvm.cell.name)
    }


    /** */
    async onTagDelete(tag: string) {
        this.dispatchEvent(new CustomEvent('deleted', {detail: tag, bubbles: true, composed: true}))
        await this._dvm.taggingZvm.untagPrivateEntry(this.hash, tag);
    }


    /** */
    render() {
        console.log("<tag-list>.render()", this.hash, this.private, this.clickable, this.tags, this.taggingPerspective);

        let tags = this.tags

        if (this.hash) {
            tags = this.private == ""
                ? this.taggingPerspective.privateTagsByTarget[this.hash]
                : this.taggingPerspective.publicTagsByTarget[this.hash]
            if (!tags) {
                tags = [];
            }
        }
        console.log({tags})


        const tagItems = tags.map((str) => {
            return html`
                <div class="tag ${this.clickable == ""? "clickable" : ""}" @click=${(e) => {
                if (this.clickable == "") {
                    this.dispatchEvent(new CustomEvent('selected', {detail: str, bubbles: true, composed: true}))
                }
                }}>
                    <span>${str}</span>
                    ${this.hash && this.private == ""
                        ? html`
                        <sl-icon-button class="hide" name="x" label="remove" style=""
                                   @click=${async (_e) => {this.onTagDelete(str)}}>
                        </sl-icon-button>`
                        : html``
                    }            
                </div>`
        });
        return html`${tagItems}`;
    }


    /** */
    static get styles() {
        return [
            sharedStyles,
            css`
              :host {
                margin-top: 5px;
                display: flex;
                flex-direction: row;
                gap: 5px;
                flex-wrap: wrap;
              }

              .tag span {
                margin-top: 2px;
              }

              .tag {
                display: flex;
                background: #bbc5ce;
                font-size: small;
                padding: 3px;
                color: #232121;
                /*border-radius: 15px;*/
              }

              .clickable:hover {
                background: #303131;
                color: white;
                cursor: pointer;
              }

              .clickable:hover .hide {
                display: inline-block;
              }

              .hide {
                display: none;
              }

              sl-icon-button {
                font-size: 1.0rem;
                color: white;
              }

              sl-icon-button::part(base) {
                padding: 4px;
              }
            `,
        ];
    }
}
