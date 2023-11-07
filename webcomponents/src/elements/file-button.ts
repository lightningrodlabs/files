import {css, html, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {
    EntryHashB64,
} from "@holochain/client";
import {FilesDvm} from "../viewModels/files.dvm";
import {filesSharedStyles} from "../sharedStyles";
import {FilesDvmPerspective} from "../viewModels/files.perspective";
import {TaggingPerspective} from "../viewModels/tagging.zvm";
import {kind2Icon} from "../fileTypeUtils";
import {SelectedType} from "./file-share-menu";


/**
 * @element
 */
@customElement("file-button")
export class FileButton extends DnaElement<FilesDvmPerspective, FilesDvm> {

    /** -- Properties -- */

    /** Hash of ParcelManifest to display */
    @property() hash: EntryHashB64 = ''

    /** Enable action bar */
    @property() showActionBar: boolean = true

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
    protected async dvmUpdated(newDvm: FilesDvm, oldDvm?: FilesDvm): Promise<void> {
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

        let tags;
        let type;
        if (isPrivate) {
            tags = this._dvm.taggingZvm.getTargetPrivateTags(this.hash);
            type = SelectedType.PrivateTag;
        } else {
            tags = this._dvm.taggingZvm.getTargetPublicTags(this.hash);
            type = SelectedType.PublicTag;        }
        let tagList = tags.map((tag) => {
            return html`                
                <sl-button class="hide tag-button pop" size="small" variant="primary" style="margin-left:5px" @click=${async (e) => {
                    this.dispatchEvent(new CustomEvent('tag', {detail: {type, tag}, bubbles: true, composed: true}));
                }}>${tag}
                    <sl-icon slot="prefix" name="tag"></sl-icon>
                </sl-button>
            `;
        });



        /** action bar */
        let actionBar = html``;
        if (this.showActionBar) {
            actionBar = html`
                <sl-button class="hide pop action" size="small" variant="primary" style="margin-left:5px" @click=${async (e) => {
                    this.dispatchEvent(new CustomEvent('download', {detail: this.hash, bubbles: true, composed: true}));
                }}>
                    <sl-icon name="download"></sl-icon>
                </sl-button>
                <sl-button class="hide pop action" size="small" variant="primary" @click=${async (e) => {
                    this.dispatchEvent(new CustomEvent('send', {detail: this.hash, bubbles: true, composed: true}));
                }}>
                    <sl-icon name="send"></sl-icon>
                </sl-button>                
            `;
        }


        /** render all */
        return html`
            <sl-popup class="fileButton" placement="bottom-start" skidding="-4" active>
                <div slot="anchor">
                    <sl-popup class="fileButton" placement="right" active>
                        <div slot="anchor" class="fileName">
                            <sl-icon class="prefixIcon" name=${kind2Icon(fileDescription.kind_info)}></sl-icon>
                            ${fileDescription.name}
                        </div>
                        ${actionBar}
                    </sl-popup>
                </div>
                ${tagList}
            </sl-popup>
        `;
    }


    /** */
    static get styles() {
        return [
            filesSharedStyles,
            css`

              sl-icon {
                font-weight: bold;
              }


              .pop::part(base) {
                background: #21374A;
                box-shadow: rgba(0, 0, 0, 0.35) 0px 5px 15px;
                font-weight: bold;
                border: none;
              }

              .pop::part(base):hover {
                cursor: pointer;
                background: aliceblue;
                color: rgb(33, 55, 74);
                border: 1px solid #2488e0;
              }

              .tag-button::part(base) {
                margin: 4px 0px 0px 0px;
              }

              .action::part(base) {
                font-size: 1.0rem;
                margin: 0px;
              }

              .fileButton {
                font-size: 1.0rem;
              }


              .fileName {
                border-radius: 6px;
                border-width: 1px;
                border-style: dashed;
                border-color: rgb(179, 179, 179);
                //font-size: 0.875rem;
                font-weight: bold;
                color: #2488e0;
                background: #FAFAFA;
                padding: 8px;
              }

              .fileButton:hover .fileName {
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
