import {css, html, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {consume} from "@lit/context";
import {DnaElement} from "@ddd-qc/lit-happ";
import {
    decodeHashFromBase64,
    EntryHashB64,
} from "@holochain/client";
import {FilesDvm} from "../viewModels/files.dvm";
import {filesSharedStyles} from "../sharedStyles";
import {FilesDvmPerspective} from "../viewModels/files.perspective";
import {TaggingPerspective} from "../viewModels/tagging.zvm";
import {kind2Icon} from "../fileTypeUtils";
import {SelectedType} from "./files-menu";
import {prettyFileSize} from "../utils";
import {ParcelDescription} from "@ddd-qc/delivery";
import {Hrl, WeServices} from "@lightningrodlabs/we-applet";
//import {weClientContext} from "@lightningrodlabs/we-applet/context";
import {createContext} from "@lit/context";

export const weClientContext = createContext<WeServices>('we_client');

/**
 * @element
 */
@customElement("file-button")
export class FileButton extends DnaElement<FilesDvmPerspective, FilesDvm> {

    /** -- Properties -- */

    /** Hash of ParcelManifest to display */
    @property() hash: EntryHashB64 = ''

    @property() description?: ParcelDescription;

    @consume({ context: weClientContext, subscribe: true })
    weServices: WeServices;


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
        console.log("<file-view>.render()", this.hash, this.description);
        if (this.hash == "" && !this.description) {
            return html`<sl-button class="fileButton" disabled>N/A</sl-button>`;
        }

        /** Retrieve File description */
        let fileDescription = this.description;
        let isPrivate = true;
        if (this.hash != "") {
            const tuple = this._dvm.deliveryZvm.perspective.privateManifests[this.hash];
            isPrivate = false;
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
                        return html`
                            <sl-button class="unknown" disabled>Unknown file</sl-button>`;
                    }
                }
            }
        }

        /** Retrieve tags */
        let tagList = [];
        let actionButtons = [];
        if (this.hash != "") {
            let tags;
            let type;
            if (isPrivate) {
                tags = this._dvm.taggingZvm.getTargetPrivateTags(this.hash);
                type = SelectedType.PrivateTag;
            } else {
                tags = this._dvm.taggingZvm.getTargetPublicTags(this.hash);
                type = SelectedType.PublicTag;
            }
            tagList = tags.map((tag) => {
                return html`
                    <sl-button class="hide tag-button pop" size="small" variant="primary" style="margin-left:5px"
                               @click=${async (e) => {
                                   this.dispatchEvent(new CustomEvent('tag', {
                                       detail: {type, tag},
                                       bubbles: true,
                                       composed: true
                                   }));
                               }}>${tag}
                        <sl-icon slot="prefix" name="tag"></sl-icon>
                    </sl-button>
                `;
            });
            /** action bar */
            actionButtons.push(html`
                <sl-button class="hide pop action" size="small" variant="primary" style="margin-left:5px" @click=${async (e) => {
                    this.dispatchEvent(new CustomEvent('download', {detail: this.hash, bubbles: true, composed: true}));
                }}>
                    <sl-icon name="download"></sl-icon>
                </sl-button>`);
            actionButtons.push(html`
                <sl-button class="hide pop action" size="small" variant="primary" @click=${async (e) => {
                    this.dispatchEvent(new CustomEvent('send', {detail: this.hash, bubbles: true, composed: true}));
                }}>
                    <sl-icon name="send"></sl-icon>
                </sl-button>`);
            /** Add button for each attachment type */
            if (this.weServices && this.weServices.attachmentTypes && this.hash != '') {
                console.log("weServices.attachmentTypes", this.weServices.attachmentTypes);
                this.weServices.attachmentTypes.forEach((attDict, _appletHash, _map) => {
                    for (const [_attName, attType] of Object.entries(attDict)) {
                        actionButtons.push(html`
                <sl-button class="hide pop action" size="small" variant="primary" @click=${async (e) => {
                        const hrl: Hrl = [decodeHashFromBase64(this.cell.dnaHash), decodeHashFromBase64(this.hash)];
                        const res = await attType.create(hrl);
                        console.log("Create attachment result:", res);
                        this.weServices.openHrl(res.hrl, res.context);
                    }}>
                    <sl-icon .src=${attType.icon_src}></sl-icon>
                </sl-button>`);
                    }
                });
            }
        }


        /** render all */
        return html`
            <sl-popup class="fileButton" placement="bottom-start" skidding="-4" active>
                <div slot="anchor">
                    <sl-popup class="fileButton" placement="right" active>
                        <div slot="anchor" class="fileName">
                            <sl-icon class="prefixIcon" name=${kind2Icon(fileDescription.kind_info)}></sl-icon>
                            <files-filename .filename=${fileDescription.name}></files-filename>
                            <span class="filesize">${prettyFileSize(fileDescription.size)}</span>
                        </div>
                        ${actionButtons}
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

              .unknown::part(base) {
                border: dotted 2px;  
              }
              
              
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

              .filesize {
                font-size: .75rem;
                color: darkgray;
                padding-left: 7px;
                padding-right: 5px;
                padding-top: 3px;
                flex-shrink: 0;
              }
              
              .fileName {
                display: flex;
                border-radius: 6px;
                border-width: 1px;
                border-style: dashed;
                border-color: rgb(179, 179, 179);
                font-weight: bold;
                color: #2488e0;
                background: #FAFAFA;
                padding: 8px;
                max-width: 250px;
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
