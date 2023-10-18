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
        return this.shadowRoot.getElementById("action-dialog") as SlDialog;
    }

    /** */
    open() {
        this.dialogElem.open = true;
    }


    /** */
    render() {
        return html`
            <sl-dialog id="action-dialog" noHeader>
                <sl-button variant="neutral">
                    <sl-icon slot="prefix" name="send"></sl-icon>
                    Send
                </sl-button>
                <sl-button variant="neutral">
                    <sl-icon slot="prefix" name="people"></sl-icon>
                    Share with the group
                </sl-button>
                <sl-button variant="neutral">
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
              sl-dialog {
                display: flex;
                flex-direction: column;
                --width: 500px;
              }
              sl-dialog::part(base) {
                z-index:auto;

              }

              sl-dialog::part(header) {
                display: none;
              }

              sl-dialog::part(body) {
                background: transparent;
                display: flex;
                flex-direction: column;
                gap: 40px;                
              }
              
              sl-dialog::part(panel) {
                background: transparent;
                box-shadow: none;
              }
              
              
              
              sl-button {
                background: transparent;
              }

              sl-button::part(base) {
                font-weight: bold;
                font-size: 18px;
                height: 100px;
                /*--sl-input-height-medium: 48px;*/
                background: #02081e82;
                border: 2px white dashed;
                border-radius: 10px
              }

              sl-button::part(label) {
                /*height: 40px;*/
                margin-top: 28px;
              }
            `
        ];
    }
}
