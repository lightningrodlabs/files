import {css, html, LitElement, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {sharedStyles} from "../sharedStyles";
import {DnaElement} from "@ddd-qc/lit-happ";
import {FileShareDvmPerspective} from "../viewModels/fileShare.perspective";
import {FileShareDvm} from "../viewModels/fileShare.dvm";
import {EntryHashB64} from "@holochain/client";


/**
 * @element
 */
@customElement('tag-list')
export class TagList extends DnaElement<FileShareDvmPerspective, FileShareDvm> {

    /** */
    @property() hash: EntryHashB64 = '';
    @property() isPrivate: boolean = false;



    /** */
    async onTagDelete(tag: string) {
        await this._dvm.taggingZvm.untagPrivateEntry(this.hash, tag);
        this.requestUpdate();
    }


    /** */
    render() {
        console.log("<tag-list>.render()", this.hash, this.isPrivate, this._dvm.taggingZvm.perspective);

        let tags = this.isPrivate
        ? this._dvm.taggingZvm.perspective.privateTagsByTarget[this.hash]
        : this._dvm.taggingZvm.perspective.publicTagsByTarget[this.hash]
        if (!tags) {
            tags = [];
        }
        console.log({tags})


        const tagItems = tags.map((str) => {
            return html`
                <div class="tag">
                    <span>${str}</span>
                    ${!this.isPrivate
                        ? html`` 
                        : html`
                        <sl-icon-button class="hide" name="x" label="remove" style=""
                                   @click=${async (_e) => {this.onTagDelete(str)}}>
                        </sl-icon-button>
                    `}            
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
                background: #91a3b7;
                font-size: small;
                padding: 3px;
                color: white;
              }

              .tag:hover {
                background: #e8eaea;
                color: #3d3c3c;
              }

              .tag:hover .hide {
                display: inline-block;
              }


              .public:hover {
                color: red;
              }

              .hide {
                display: none;
              }

              sl-icon-button {
                font-size: 1.0rem;
              }

              sl-icon-button::part(base) {
                padding: 4px;
              }
            `,
        ];
    }
}
