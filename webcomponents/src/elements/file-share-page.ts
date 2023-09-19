import {css, html, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {delay, DnaElement} from "@ddd-qc/lit-happ";
import {Dictionary} from "@ddd-qc/cell-proxy";
import {
    ActionHashB64,
    decodeHashFromBase64,
    DnaHashB64,
    encodeHashToBase64,
    EntryHashB64,
} from "@holochain/client";
import {
    AppletInfo,
    Hrl,
    WeServices, weServicesContext,
} from "@lightningrodlabs/we-applet";
import {consume} from "@lit-labs/context";

import {FileShareDvm} from "../viewModels/fileShare.dvm";
import {FileShareProfile} from "../viewModels/profiles.proxy";
import {ProfilesZvm} from "../viewModels/profiles.zvm";
import {globalProfilesContext} from "../viewModels/happDef";
import {base64ToArrayBuffer, emptyAppletId, getInitials, prettyFileSize, SplitObject} from "../utils";
import {FileSharePerspective} from "../viewModels/fileShare.zvm";
import {DeliveryPerspective, DeliveryStateType} from "@ddd-qc/delivery";
import {ParcelKindVariantManifest} from "@ddd-qc/delivery/dist/bindings/delivery.types";

/**
 * @element
 */
@customElement("file-share-page")
export class FileSharePage extends DnaElement<unknown, FileShareDvm> {

    constructor() {
        super(FileShareDvm.DEFAULT_BASE_ROLE_NAME);
        /** Create a fake appletId for testing without We */
        //fakeEntryHash().then((eh) => this.appletId = encodeHashToBase64(eh));

        this.addEventListener('beforeunload', (e) => {
            console.log("<file-share-page> beforeunload", e);
            // await this._dvm.threadsZvm.commitSearchLogs();
        });

    }

    /** -- Fields -- */
    @state() private _initialized = false;
    @state() private _uploading?: SplitObject; // data_hash
    @property() appletId: EntryHashB64;


    /** Observed perspective from zvm */
    @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
    fileSharePerspective!: FileSharePerspective;

    @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
    deliveryPerspective!: DeliveryPerspective;

    @consume({ context: globalProfilesContext, subscribe: true })
    _profilesZvm!: ProfilesZvm;

    @consume({ context: weServicesContext, subscribe: true })
    weServices!: WeServices;

    private _myProfile: FileShareProfile = {nickname: "unknown", fields: {}}


    /** AppletId -> AppletInfo */
    @state() private _appletInfos: Dictionary<AppletInfo> = {}


    /**
     * In dvmUpdated() this._dvm is not already set!
     * Subscribe to ZVMs
     */
    protected async dvmUpdated(newDvm: FileShareDvm, oldDvm?: FileShareDvm): Promise<void> {
        console.log("<file-view>.dvmUpdated()");
        if (oldDvm) {
            console.log("\t Unsubscribed to Zvms roleName = ", oldDvm.fileShareZvm.cell.name)
            oldDvm.fileShareZvm.unsubscribe(this);
            oldDvm.deliveryZvm.unsubscribe(this);
        }
        newDvm.fileShareZvm.subscribe(this, 'fileSharePerspective');
        newDvm.deliveryZvm.subscribe(this, 'deliveryPerspective');
        console.log("\t Subscribed Zvms roleName = ", newDvm.fileShareZvm.cell.name)
        //newDvm.fileShareZvm.probeAll();
    }


    /** After first render only */
    async firstUpdated() {
        // this._initialized = true;
        console.log("<file-share-page> firstUpdated()", this.appletId);

        /** Generate test data */
        if (!this.appletId) {
            this.appletId = encodeHashToBase64(await emptyAppletId());
            console.warn("no appletId provided. A fake one has been generated", this.appletId);
        }
        //await this._dvm.threadsZvm.generateTestData(this.appletId);


        // await delay(50)
        // await this._dvm.postProcess();

        /** */
        //const leftSide = this.shadowRoot.getElementById("leftSide");
        //leftSide.style.background = "#B9CCE7";

        this.requestUpdate();
    }


    /** */
    async onAddFile(): Promise<SplitObject | undefined> {
        const fileInput = this.shadowRoot!.getElementById("addLocalFile") as HTMLInputElement;
        console.log("onAddFile():", fileInput.files.length);
        if (fileInput.files.length > 0) {
            let res = await this._dvm.startCommitPrivateFile(fileInput.files[0]);
            console.log("onAddFile() res:", res);
            fileInput.value = "";
            return res;
        }
    }


    /** */
    async onPublishFile(): Promise<SplitObject | undefined> {
        const fileInput = this.shadowRoot!.getElementById("publishFile") as HTMLInputElement;
        console.log("onPublishFile():", fileInput.files.length);
        const splitObj = await this._dvm.startPublishFile(fileInput.files[0]);
        console.log("onPublishFile() splitObj:", splitObj);
        fileInput.value = "";
        return splitObj;
    }

    /** */
    async onPublishPrivateFile(e: any) {
        //     const localFileInput = this.shadowRoot!.getElementById("publishFileSelector") as HTMLSelectElement;
        //     console.log("onPublishLocalFile():", localFileInput.value);
        //     let distribAh = await this._dvm.publishPrivateFile(localFileInput.value);
        //     console.log("onPublishLocalFile() distribAh:", distribAh);
        //     localFileInput.value = "";
    }


    /** */
    async onSendFile(e: any) {
        const localFileInput = this.shadowRoot!.getElementById("localFileSelector") as HTMLSelectElement;
        const agentSelect = this.shadowRoot!.getElementById("recipientSelector") as HTMLSelectElement;
        console.log("onSendFile():", localFileInput.value, agentSelect.value);
        let distribAh = await this._dvm.fileShareZvm.sendFile(localFileInput.value, agentSelect.value);
        console.log("onSendFile() distribAh:", distribAh);
        localFileInput.value = "";
    }


    /** */
    async refresh() {
        await this._dvm.probeAll();
        await this._dvm.probePublicFiles();
        await this._dvm.fileShareZvm.getPrivateFiles();
        await this._dvm.deliveryZvm.queryAll();
        this.requestUpdate();
    }


    /** */
    async downloadFile(manifestEh: EntryHashB64): Promise<void> {
        /** Get File on source chain */
        const [manifest, data] = await this._dvm.getLocalFile(manifestEh);

        /** DEBUG - check if content is valid base64 */
        // if (!base64regex.test(data)) {
        //   const invalid_hash = sha256(data);
        //   console.error("File '" + manifest.filename + "' is invalid base64. hash is: " + invalid_hash);
        // }

        let filetype = (manifest.description.kind_info as ParcelKindVariantManifest).Manifest;
        console.log("downloadFile()", filetype);
        const fields = filetype.split(':');
        if (fields.length > 1) {
            const types = fields[1].split(';');
            filetype = types[0];
        }
        const byteArray = base64ToArrayBuffer(data)
        const blob = new Blob([byteArray], { type: filetype});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = manifest.description.name || 'download';
        a.addEventListener('click', () => {}, false);
        a.click();
    }


    /** */
    printNoticeReceived() {
        for (const [distribAh, noticeAck] of Object.entries(this._dvm.deliveryZvm.perspective.noticeAcks)) {
            console.log(` - "${distribAh}": distrib = "${encodeHashToBase64(noticeAck.distribution_ah)}"; recipient = "${encodeHashToBase64(noticeAck.recipient)}"`)
        }
    }


    /** */
    render() {
        console.log("<file-share-page>.render()", this._initialized, this._dvm.deliveryZvm.perspective, this._profilesZvm.perspective);
        this.printNoticeReceived();

        if (!this._profilesZvm) {
            console.error("this._profilesZvm not found");
            //this._myProfile = { nickname: "dummy" + Math.floor(Math.random() * 100), fields: {}};
        } else {
            this._myProfile = this._profilesZvm.getMyProfile();
            if (!this._myProfile) {
                this._myProfile = { nickname: "guest_" + Math.floor(Math.random() * 100), fields: {}};
                this._profilesZvm.createMyProfile(this._myProfile).then(() => this.requestUpdate());
            }
        }

        /** This agent's profile info */
        let agent = {nickname: "unknown", fields: {}} as FileShareProfile;
        let maybeAgent = undefined;
        if (this._profilesZvm) {
            maybeAgent = this._myProfile;
            if (maybeAgent) {
                agent = maybeAgent;
            } else {
                //console.log("Profile not found for", texto.author, this._dvm.profilesZvm.perspective.profiles)
                this._profilesZvm.probeProfile(this._dvm.cell.agentPubKey);
                //.then((profile) => {if (!profile) return; console.log("Found", profile.nickname)})
            }
        }
        const initials = getInitials(agent.nickname);
        const avatarUrl = agent.fields['avatar'];


        if (this._uploading) {
            const maybeManifest = this._dvm.deliveryZvm.perspective.localManifestByData[this._uploading.dataHash];
            if (maybeManifest) {
                this._uploading = undefined;
            }
        }

        const AgentOptions = Object.entries(this._profilesZvm.perspective.profiles).map(
            ([agentIdB64, profile]) => {
                //console.log("" + index + ". " + agentIdB64)
                return html `<option value="${agentIdB64}">${profile.nickname}</option>`
            }
        )

        console.log("localFiles found:", Object.entries(this._dvm.fileShareZvm.perspective.privateFiles).length);

        const fileOptions = Object.entries(this._dvm.fileShareZvm.perspective.privateFiles).map(
            ([eh, manifest]) => {
                //console.log("" + index + ". " + agentIdB64)
                return html `<option value="${eh}">${manifest.description.name}</option>`
            }
        )

        /** Public files list */
        let publicFileList = Object.entries(this._dvm.perspective.publicFiles).map(
            ([_dataHash, ppEh]) => {
                const description = this._dvm.deliveryZvm.perspective.publicParcels[ppEh];
                console.log("description", description);
                // FIXME check if we also have file locally (with data_hash)
                if (!description) {
                    return html``;
                }
                return html `
                    <li>
                        ${description.name} | ${prettyFileSize(description.size)}
                        <button type="button" @click=${() => {this.downloadFile(ppEh);}}>download</button>
                    </li>`
            }
        )
        if (publicFileList.length == 0) {
            publicFileList[0] = html`No files found`;
        }

        /** Local public files list */
        let localPublicFileList = Object.entries(this._dvm.fileShareZvm.perspective.localPublicFiles).map(
            ([eh, manifest]) => {
                //console.log("" + index + ". " + agentIdB64)
                return html `
                    <li value="${eh}">
                        ${manifest.description.name} | ${prettyFileSize(manifest.description.size)}
                        <button type="button" @click=${() => {this.downloadFile(eh);}}>download</button>
                    </li>`
            }
        )
        if (localPublicFileList.length == 0) {
            localPublicFileList[0] = html`No files found`;
        }

        /** Local files list */
        let privateFileList = Object.entries(this._dvm.fileShareZvm.perspective.privateFiles).map(
            ([eh, manifest]) => {
                //console.log("" + index + ". " + agentIdB64)
                return html `
                    <li value="${eh}">
                        ${manifest.description.name} | ${prettyFileSize(manifest.description.size)}
                        <button type="button" @click=${() => {this.downloadFile(eh);}}>download</button>
                    </li>`
            }
        )
        if (privateFileList.length == 0) {
            privateFileList[0] = html`No files found`;
        }


        /** Unreplied inbounds */
        let inboundList = Object.entries(this._dvm.deliveryZvm.inbounds()).map(
            ([noticeEh, [notice, ts, pct]]) => {
                console.log("" + noticeEh, this.deliveryPerspective.notices[noticeEh]);
                const senderKey = encodeHashToBase64(notice.sender);
                const senderProfile = this._profilesZvm.getProfile(senderKey);
                let sender = senderKey;
                if (senderProfile) {
                    sender = senderProfile.nickname
                }
                if (pct == -1) {
                    return html`
                        <li id="inbound_${noticeEh}">
                            "${notice.summary.parcel_reference.description.name}" - From: ${sender} - ${prettyFileSize(notice.summary.parcel_reference.description.size)}
                            <button type="button" @click=${async () => {
                                console.log("Accepting", noticeEh);
                        await this._dvm.deliveryZvm.acceptDelivery(noticeEh);
                        //await this.refresh();
                    }}>accept
                            </button>
                            <button type="button" @click=${async () => {
                        await this._dvm.deliveryZvm.declineDelivery(noticeEh);
                        //await this.refresh();
                    }}>decline
                            </button>
                        </li>`
                } else {
                    return html`<li id="inbound_${noticeEh}">
                            "${notice.summary.parcel_reference.description.name}" - From: ${sender} - ${prettyFileSize(notice.summary.parcel_reference.description.size)} | RETRIEVING ${pct}%
                    </li>`;
                }
            });

        if (inboundList.length == 0) {
            inboundList = [html`No files inbound`];
        }


        /** Unreplied outbounds */
        let outboundList = Object.entries(this._dvm.deliveryZvm.outbounds()).map(
            ([distribEh, [distrib, ts, deliveryStates]]) => {
                //console.log("" + index + ". " + agentIdB64)
                const manifestEh = encodeHashToBase64(distrib.delivery_summary.parcel_reference.eh);
                const manifest = this._dvm.fileShareZvm.perspective.privateFiles[manifestEh];
                const date = new Date(ts / 1000); // Holochain timestamp is in micro-seconds, Date wants milliseconds
                const date_str = date.toLocaleString('en-US', {hour12: false});

                const outboundItems = Object.entries(deliveryStates).map( ([recipientKey, state]) => {
                    //const [_nts, notice] = this._dvm.deliveryZvm.perspective.allNotices[noticeEh];
                    const profile = this._profilesZvm.getProfile(recipientKey);
                    let recipient = recipientKey;
                    if (profile) {
                        recipient = profile.nickname
                    }
                    if (DeliveryStateType.Unsent in state) {
                        return html`<li>${recipient} | Delivery notice unsent</li>`
                    }
                    if (DeliveryStateType.PendingNotice in state) {
                        return html`<li>${recipient} | Delivery notice pending reception</li>`
                    }
                    if (DeliveryStateType.NoticeDelivered in state) {
                        return html`<li>${recipient} | Waiting for reply</li>`
                    }
                })

                if (outboundItems.length == 0) {
                    return html``;
                } else {
                    return html`
                        <li>
                            <div>${manifest.description.name} (${prettyFileSize(manifest.description.size)}) [${date_str}]</div>
                            <ul id="outboud_${distribEh}">
                                ${outboundItems}
                            </ul>
                        </li>`
                }
            }
        )
        if (outboundList.length == 0) {
            outboundList[0] = html`No files outbound`;
        }

        /** Render all */
        return html`
        <div><abbr title="${this.cell.agentPubKey}">${this._myProfile.nickname}</abbr></div>
        <h1>
          FileShare Central 
          <button type="button" @click=${() => {this._dvm.dumpLogs();}}>dump</button>
          <button type="button" @click=${() => {this.refresh();}}>refresh</button>               
        </h1>
         ${this._uploading? html`Uploading... ${Math.ceil(this._dvm.deliveryZvm.perspective.chunkCounts[this._uploading.dataHash] / this._uploading.numChunks * 100)}%` : html`
            <div>
                <label for="publishFile">Publish new file:</label>
                <input type="file" id="publishFile" name="publishFile" />
                <input type="button" value="Publish" @click=${async () => {
                    const maybeSplitObj = await this.onPublishFile();
                    if (maybeSplitObj) {
                        this._uploading = maybeSplitObj;
                    }
        }}>
            </div>`
        };  
        <!--<div>
          <label>Publish local file:</label>
          <select id="publishFileSelector">
            ${fileOptions}
          </select>
          <input type="button" value="publish" @click=${this.onPublishPrivateFile}>
        </div>-->

        <div style="margin-top:20px;">
          <label>Send File:</label>
          <select id="localFileSelector">
            ${fileOptions}
          </select>
            to: <select id="recipientSelector">
              ${AgentOptions}
          </select>
          <input type="button" value="send" @click=${this.onSendFile}>
        </div>

        <hr/>
        <h2>Public files</h2>
        <ul>
            ${publicFileList}
        </ul>
        
        <h2>My public files</h2>
        <ul>
            ${localPublicFileList}
        </ul>
        
        <h2>Private files</h2>
        <ul>
            ${privateFileList}
        </ul>
        ${this._uploading? html`Uploading... ${Math.ceil(this._dvm.deliveryZvm.perspective.chunkCounts[this._uploading.dataHash] / this._uploading.numChunks * 100)}%` : html`
        <label for="addLocalFile">Add private file to source-chain:</label>
        <input type="file" id="addLocalFile" name="addLocalFile" />
        <input type="button" value="Add" @click=${async() => {
            const maybeSplitObj = await this.onAddFile();
            if (maybeSplitObj) {
                this._uploading = maybeSplitObj;
            }
            //this._uploading = false;
        }
        }>`}   
          
        <hr/>
        <h2>Inbound files:</h2>
        <ul>
          ${inboundList}
        </ul>
          
        <hr/>
        <h2>Outbound files:</h2>
        <ul>
          ${outboundList}
        </ul>          
    `;
    }

}
