import {css, html, LitElement} from "lit";
import {customElement} from "lit/decorators.js";
import {SlDialog} from "@shoelace-style/shoelace";
import {filesSharedStyles} from "../sharedStyles";
import {msg} from '@lit/localize';


/**
 * @element
 */
@customElement("action-overlay")
export class ActionOverlay extends LitElement {

    /** */
    get dialogElem() : SlDialog {
        return this.shadowRoot!.querySelector("sl-dialog") as SlDialog;
    }


    isOpen(): boolean {
      return this.dialogElem && this.dialogElem.open;
    }

    /** */
    open() {
        this.dialogElem.open = true;
    }

    /** */
    close() {
        console.log("<action-overlay>.close()");
        this.dialogElem.open = false;
    }


    /** */
    onClick(action: string) {
        this.dispatchEvent(new CustomEvent(action, {detail: null, bubbles: true, composed: true}));
        this.dialogElem.open = false;
    }


    /** */
    override render() {
        return html`
            <sl-dialog id="action-overlay" class="action-dialog" noHeader>
                <sl-button variant="neutral" @click=${() => this.onClick("ao-send")}>
                    <sl-icon slot="prefix" name="send"></sl-icon>
                    ${msg("Send")}
                </sl-button>
                <sl-button variant="neutral" @click=${() => this.onClick("ao-publish")}>
                    <sl-icon slot="prefix" name="people"></sl-icon>
                    ${msg("Share with the group")}
                </sl-button>
                <sl-button variant="neutral" @click=${() => this.onClick("ao-store")}>
                    <sl-icon slot="prefix" name="hdd"></sl-icon>
                    ${msg("Add to my personal files")}
                </sl-button>
            </sl-dialog>
        `;

    }

    /** */
    static override get styles() {
        return [
            filesSharedStyles,
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
