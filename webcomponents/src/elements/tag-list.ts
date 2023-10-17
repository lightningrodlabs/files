import {css, html, LitElement, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {sharedStyles} from "../sharedStyles";


/**
 * @element
 */
@customElement('tag-list')
export class TagList extends LitElement {

    /** */
    @property() tags: string[] = [];
    @property() selectable?: string;
    @property() deletable?: string;


    /** */
    async onTagDelete(tag: string) {
        this.dispatchEvent(new CustomEvent('deleted', {detail: tag, bubbles: true, composed: true}))
    }


    /** */
    render() {
        //console.log("<tag-list>.render()", this.tags, this.selectable, this.deletable);
        const tagItems = this.tags.map((str) => {
            return html`
                <div class="tag ${this.selectable == ""? "selectable" : ""}" @click=${(e) => {
                if (this.selectable == "") {
                    this.dispatchEvent(new CustomEvent('selected', {detail: str, bubbles: true, composed: true}))
                }
                }}>
                    <span>${str}</span>
                    ${this.deletable == ""
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

              .selectable:hover {
                background: #303131;
                color: white;
                cursor: pointer;
              }

              .selectable:hover .hide {
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
