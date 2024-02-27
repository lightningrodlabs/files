import {css, html, PropertyValues} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {decodeHashFromBase64, EntryHashB64,} from "@holochain/client";
import {FilesDvm} from "../viewModels/files.dvm";
import {ParcelManifest} from "@ddd-qc/delivery";
import {filesSharedStyles} from "../sharedStyles";
import {FilesDvmPerspective} from "../viewModels/files.perspective";
import {msg} from "@lit/localize";
import {prettyFileSize} from "../utils";
import {FileType, kind2mime, kind2Type} from "../fileTypeUtils";


/**
 * @element
 */
@customElement("file-view")
export class FileView extends DnaElement<FilesDvmPerspective, FilesDvm> {

    /** -- Properties -- */

    /** Hash of ParcelManifest to display */
    @property() hash: EntryHashB64 = ''

    /** Enable action bar */
    @property() showActionBar: boolean = true

    /** Observed perspective from zvm */
    // @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
    // filesPerspective!: FileSharePerspective;

    /** -- State variables -- */

    @state() private _loading = true;
    @state() private _manifest?: ParcelManifest;
             private _maybeFile?: File;
             private _maybeDataUrl?: string | ArrayBuffer;
             private _maybeBlobUrl?: string;

    /** -- Methods -- */


    /** FOR DEBUGGING */
    shouldUpdate(changedProperties: PropertyValues<this>) {
        console.log("<file-view>.shouldUpdate()", changedProperties, this._dvm);
        if (changedProperties.has("_cell_via_context")) {
            this._cell = this._cell_via_context;
        }
        if (!this._dvm) {
            this.requestDvm();
        }
        return !!this._dvm;
    }


    /** */
    protected async willUpdate(changedProperties: PropertyValues<this>) {
        super.willUpdate(changedProperties);
        //console.log("<file-view>.willUpdate()", changedProperties, !!this._dvm, this.hash);
        if (this._dvm && (changedProperties.has("hash") || (!this._manifest && this.hash))) {
            console.log("<file-view>.willUpdate()", this.hash);
            this._loading = true;
            this._manifest = await this._dvm.filesZvm.zomeProxy.getFileInfo(decodeHashFromBase64(this.hash));
            //console.log(`<file-view>.willUpdate() ${this._manifest.description.size} < ${this._dvm.dnaProperties.maxChunkSize}?`);
            if (this._manifest.description.size < this._dvm.dnaProperties.maxChunkSize) {
                const mime = kind2mime(this._manifest.description.kind_info);
                //const fileType = kind2Type(this._manifest.description.kind_info);
                const data = await this._dvm.deliveryZvm.getParcelData(this.hash);
                this._maybeFile = this._dvm.data2File(this._manifest, data);

                const reader = new FileReader();
                if (this._maybeBlobUrl) {
                    URL.revokeObjectURL(this._maybeBlobUrl);
                    this._maybeBlobUrl = undefined;
                }
                //this._maybeBlobUrl = URL.createObjectURL(this._maybeFile);
                reader.onload = (event) => {
                    console.log("FileReader onload", event, mime)
                    //this._maybeDataUrl = event.target.result;
                    const blob = new Blob([event.target.result], { type: mime });
                    this._maybeBlobUrl = URL.createObjectURL(blob);
                    console.log("FileReader blob", blob, this._maybeBlobUrl)
                    //this.requestUpdate();
                    this._loading = false;
                };
                //reader.readAsDataURL(this._maybeFile);
                reader.readAsArrayBuffer(this._maybeFile);
            } else {
                this._loading = false;
            }
        }
    }


    /** */
    render() {
        console.log("<file-view>.render()", this.hash, this._maybeBlobUrl);
        if (this.hash == "") {
            return html`
                <div style="color:#c10a0a">${msg("No file selected")}</div>`;
        }
        if (!this._manifest) {
            return html`
                <div style="color:#c10a0a">${msg("File not found")}</div>`;
        }
        if (this._loading) {
            return html`<sl-spinner></sl-spinner>`;
        }

        //const file_type = (this._manifest.description.kind_info as ParcelKindVariantManifest).Manifest;
        const mime = kind2mime(this._manifest.description.kind_info);

        const fileType = kind2Type(this._manifest.description.kind_info);

        let preview = html`<div id="preview">File too big for preview</div>`;
        if (this._maybeFile) {
            switch (fileType) {
                // case FileType.Text:
                //     // const tt = atob((this._maybeBlobUrl as string).split(',')[1]);
                //     // //const text = decodeURIComponent(escape(tt)));
                //     // console.log("FileType.Text", this._maybeDataUrl)
                //     // preview = html`<div id="preview" class="text">${tt}</div>`;
                //     preview = html`<embed id="preview" src=${this._maybeBlobUrl} type=${mime} width="440px" height="300px" />`;
                //     break;
                // case FileType.Pdf:
                //     preview = html`<embed id="preview" src=${this._maybeBlobUrl} type=${mime} width="440px" height="300px" />`;
                //     //preview = html`<embed id="preview" src=${this._maybeBlobUrl} type="application/pdf" width="100%" height="600px" />`;
                //     break;
                // case FileType.Image:
                //     preview = html`<img id="preview" src=${this._maybeBlobUrl} alt="Preview Image" />`;
                //     break;
                case FileType.Audio:
                    preview = html`
                        <audio id="preview" controls>
                            <source src=${this._maybeBlobUrl} type=${mime}>
                            Your browser does not support the audio element.
                        </audio>
                    `;
                    break;
                case FileType.Video:
                    preview = html`
                        <video id="preview" class="Video" controls width="440" height="320">
                            <source src=${this._maybeBlobUrl} type=${mime}>
                            Your browser does not support the video element.
                        </video>
                    `;
                    break;
                default:
                    //preview = html`<div id="preview">Preview not available for this type</div>`;
                    preview = html`<embed id="preview" class="${fileType}" src=${this._maybeBlobUrl} type=${mime} />`;
                    break;
            }
        }


        /** render all */
        return html`
            <h4 style="margin-left: 5px;">${this._manifest.description.name}</h4>
            <div>Size: ${prettyFileSize(this._manifest.description.size)}</div>
            <div style="padding-bottom: 10px;">MIME: ${mime}</div>
            ${preview}
            ${this.showActionBar
                    ? html`<sl-button variant="primary" @click=${(e) => {this._dvm.downloadFile(this.hash)}}>Download</sl-button>`
                    : html``
            }
        `;
    }

    /** */
    static get styles() {
        return [
            filesSharedStyles,
          css`
              :host {
                  display: flex;
                  flex-direction: column;
              }
              
              #preview {
                  background: #dadada;
                  min-height: 40px;
                  min-width: 40px;
                  max-height: 400px;
                  max-width: 440px;
                  overflow: auto;
                  padding: 5px;                  
              }

              .Image,
              .Video {
                  height: 300px;
                  width: 440px;
              }
              
              .PDF,
              .Document,
              .Text {
                  height: 300px;
                  white-space: pre;
                  box-shadow: rgba(0, 0, 0, 0.15) 0px 3px 3px 0px inset;
              }

              sl-button {
                  margin-top: 10px;
                  max-width: 120px;
              }

              sl-button::part(label) {
                  font-weight: bold;
              }
          `,
        ];
    }
}
