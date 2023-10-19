import {css, html, LitElement, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {consume} from "@lit-labs/context";
import {toastError} from "../toast";
import {prettyFileSize, splitFile} from "../utils";
import {SlDialog} from "@shoelace-style/shoelace";
import {sharedStyles} from "../sharedStyles";


/**
 * @element
 */
@customElement("action-overlay")
export class ActionOverlay extends LitElement {


    /** */
    get dialogElem() : SlDialog {
        return this.shadowRoot.querySelector("sl-dialog") as SlDialog;
    }

    /** */
    open() {
        this.dialogElem.open = true;
    }

    isOpen(): boolean {
      return this.dialogElem && this.dialogElem.open;
    }

    /** */
    onClick(action: string) {
        this.dispatchEvent(new CustomEvent('selected', {detail: action, bubbles: true, composed: true}));
        this.dialogElem.open = false;
    }


    /** */
    render() {
        return html`
            <sl-dialog id="action-overlay" class="action-dialog" noHeader>
                <sl-button variant="neutral" @click=${(e) => {this.onClick("send")}}>
                    <sl-icon slot="prefix" name="send"></sl-icon>
                    Send
                </sl-button>
                <sl-button variant="neutral" @click=${(e) => {this.onClick("publish")}}>
                    <sl-icon slot="prefix" name="people"></sl-icon>
                    Share with the group
                </sl-button>
                <sl-button variant="neutral" @click=${(e) => {this.onClick("add")}}>
                    <sl-icon slot="prefix" name="hdd"></sl-icon>
                    Add to my private files
                </sl-button>
            </sl-dialog>
        `;

    }

    /** */
    static get styles() {
        return [
            sharedStyles,
            css`
              #action-overlay {
                --width: 500px;
              }

              #action-overlay::part(header) {
                display: none;
              }

              #action-overlay::part(body) {
                gap: 40px;
              }

              #action-overlay::part(panel) {
                background: transparent;
                border:none;
              }

              /** BUTTONS */

              sl-button {
                background: transparent;
              }

              sl-button::part(base) {
                font-weight: bold;
                font-size: 18px;
                height: 100px;
                /*--sl-input-height-medium: 48px;*/
                background: rgba(14, 9, 36, 0.85);
                border: 2px white dashed;
                border-radius: 10px
              }

              sl-button::part(base):hover {
                background: rgba(255, 255, 255, 0.84);
                color: #0b0934;
              }

              sl-button::part(label) {
                /*height: 40px;*/
                margin-top: 28px;
              }
            `
        ];
    }
}
