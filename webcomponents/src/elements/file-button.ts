import {css, html, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {
    EntryHashB64,
} from "@holochain/client";
import {FileShareDvm} from "../viewModels/fileShare.dvm";
import {mime2icon, prettyFiletype} from "../utils";
import {sharedStyles} from "../sharedStyles";
import {FileShareDvmPerspective} from "../viewModels/fileShare.perspective";
import {TaggingPerspective} from "../viewModels/tagging.zvm";


/**
 * @element
 */
@customElement("file-button")
export class FileButton extends DnaElement<FileShareDvmPerspective, FileShareDvm> {

    /** -- Properties -- */

    /** Hash of ParcelManifest to display */
    @property() hash: EntryHashB64 = ''

    /** Enable action bar */
    @property() showActionBar: boolean = false

    /** -- State variables -- */

    // @state() private _loading = true;
    // @state() private _manifest?;


    /** -- Methods -- */


    /** Observed perspective from zvm */
    @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
    taggingPerspective!: TaggingPerspective;


    /**
     * In dvmUpdated() this._dvm is not already set!
     * Subscribe to ZVMs
     */
    protected async dvmUpdated(newDvm: FileShareDvm, oldDvm?: FileShareDvm): Promise<void> {
        console.log("<file-button>.dvmUpdated()");
        if (oldDvm) {
            console.log("\t Unsubscribed to Zvms roleName = ", oldDvm.taggingZvm.cell.name)
            oldDvm.taggingZvm.unsubscribe(this);
        }
        newDvm.taggingZvm.subscribe(this, 'taggingPerspective');
        console.log("\t Subscribed Zvms roleName = ", newDvm.taggingZvm.cell.name)
    }


    /** */
    render() {
        console.log("<file-view>.render()", this.hash);
        if (this.hash == "") {
            return html`<sl-button disabled>N/A</sl-button>`;
        }

        /** Retrieve File description */
        const tuple = this._dvm.deliveryZvm.perspective.privateManifests[this.hash];
        let fileDescription;
        let isPrivate = false;
        if (tuple) {
            fileDescription = tuple[0].description;
            isPrivate = true;
        } else {
            const tuple = this._dvm.deliveryZvm.perspective.localPublicManifests[this.hash];
            if (tuple) {
                fileDescription = tuple[0].description;
            } else {
                const tuple = this._dvm.deliveryZvm.perspective.publicParcels[this.hash];
                if (tuple) {
                    fileDescription = tuple[0];
                } else {
                    return html`<sl-button disabled>File not found</sl-button>`;
                }
            }
        }

        let tagList;
        if (isPrivate) {
            // @deleted=${async (e) => {await this._dvm.taggingZvm.untagPrivateEntry(this.hash, e.detail); this.requestUpdate()}}
            const tags = this._dvm.taggingZvm.getTargetPrivateTags(this.hash);
            tagList = html`<tag-list class="hide" .tags=${tags} selectable></tag-list>`;
        } else {
            const tags = this._dvm.taggingZvm.getTargetPublicTags(this.hash);
            tagList = html`<tag-list class="hide" .tags=${tags} selectable></tag-list>`;
        }



        /** render all */
        return html`
            <div class="fileButton">
                <sl-icon class="prefixIcon" name=${mime2icon(prettyFiletype(fileDescription.kind_info))}></sl-icon>
                ${fileDescription.name}
                <sl-button class="hide" size="small" variant="primary" style="margin-left:5px" @click=${async (e) => {
                    this.dispatchEvent(new CustomEvent('download', {detail: this.hash, bubbles: true, composed: true}));
                }}>
                    <sl-icon name="download"></sl-icon>
                </sl-button>
                <sl-button class="hide" size="small" variant="primary" @click=${async (e) => {
                        this.dispatchEvent(new CustomEvent('send', {detail: this.hash, bubbles: true, composed: true}));
                    }}>
                    <sl-icon name="send"></sl-icon>
                </sl-button>
                ${tagList}
            </div>
        `;
    }


    /** */
    static get styles() {
        return [
            sharedStyles,
            css`
              .fileButton {
                border-radius: 6px;
                border-width: 1px;
                border-style: dashed;
                border-color: rgb(179, 179, 179);
                font-size: 0.875rem;
                font-weight: bold;
                color: #2488e0;
                background: #FAFAFA;
                padding: 5px;
              }

              .prefixIcon {
                font-size: 1.275rem;
                margin-right: 2px;
                margin-bottom: -5px;
              }

              sl-icon {
                font-weight: bold;
              }

              .fileButton:hover {
                /*color: #09c8f3;*/
                box-shadow: rgba(0, 0, 0, 0.35) 0px 5px 15px;
                background: white;
                border: none;
              }

              .fileButton:hover sl-button.hide {
                display: inline-block;
              }

              .fileButton:hover tag-list.hide {
                display: flex;
              }

              .hide {
                display: none;
              }

            `
        ];
    }
}
