import {css, html, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {delay, DnaElement} from "@ddd-qc/lit-happ";
import {Dictionary} from "@ddd-qc/cell-proxy";
import {
    ActionHashB64,
    decodeHashFromBase64,
    DnaHashB64,
    encodeHashToBase64,
    EntryHashB64, Timestamp,
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
import {base64ToArrayBuffer, emptyAppletHash, getInitials, prettyFileSize, prettyFiletype, SplitObject} from "../utils";
import {FileSharePerspective} from "../viewModels/fileShare.zvm";
import {DeliveryPerspective, DeliveryStateType, SignalProtocolType, ParcelKindVariantManifest} from "@ddd-qc/delivery";
import {
    FileShareNotification,
    FileShareNotificationType,
    FileShareNotificationVariantDistributionToRecipientComplete,
    FileShareNotificationVariantNewNoticeReceived,
    FileShareNotificationVariantPrivateCommitComplete,
    FileShareNotificationVariantPublicSharingComplete,
    FileShareNotificationVariantReceptionComplete, FileShareNotificationVariantReplyReceived
} from "../viewModels/fileShare.perspective";
import {createAlert} from "../toast";

import "./activity-timeline";
import "./file-table";
import "./file-view";

import {
    SlAlert,
    SlCard,
    SlTooltip,
    SlBadge,
    SlButton,
    SlInput,
    SlDetails,
    SlSkeleton,
    SlDrawer
} from "@shoelace-style/shoelace";

import "@shoelace-style/shoelace/dist/components/avatar/avatar.js";
import "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/badge/badge.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/card/card.js";
import "@shoelace-style/shoelace/dist/components/dialog/dialog.js";
import "@shoelace-style/shoelace/dist/components/drawer/drawer.js";
import "@shoelace-style/shoelace/dist/components/details/details.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";
import "@shoelace-style/shoelace/dist/components/input/input.js";
import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";
import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
import "@shoelace-style/shoelace/dist/components/tooltip/tooltip.js";

import {Upload, UploadBeforeEvent, UploadFileRejectEvent} from "@vaadin/upload";
// import {UploadFile} from "@vaadin/upload/src/vaadin-upload";

import '@vaadin/grid/theme/lumo/vaadin-grid.js';
import '@vaadin/grid/theme/lumo/vaadin-grid-selection-column.js';
import '@vaadin/upload/theme/lumo/vaadin-upload.js';


/**
 * @element
 */
@customElement("file-share-page")
export class FileSharePage extends DnaElement<unknown, FileShareDvm> {

    // constructor() {
    //     super(FileShareDvm.DEFAULT_BASE_ROLE_NAME);
    //       this.addEventListener('beforeunload', (e) => {
    //         console.log("<file-share-page> beforeunload", e);
    //     });
    // }

    /** -- Fields -- */
    @state() private _initialized = false;
    @state() private _uploading?: SplitObject;
    @property() appletHash: EntryHashB64;

    @property() devmode: boolean = false;

    private _notifCount = 0;

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


    get drawerElem() : SlDrawer {
        return this.shadowRoot.getElementById("activityDrawer") as SlDrawer;
    }


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
        console.log("<file-share-page> firstUpdated()", this.appletHash);

        /** Generate test data */
        if (!this.appletHash) {
            this.appletHash = encodeHashToBase64(await emptyAppletHash());
            console.warn("no appletHash provided. A fake one has been generated", this.appletHash);
        }
    }


    /** */
    updated() {
        //console.log("UPDATED START");
        /** Add behavior to buttons in reply notification */
        const acceptButton = document.getElementById("accept-notice-btn") as HTMLInputElement;
        const declineButton = document.getElementById("decline-notice-btn") as HTMLInputElement;
        if (acceptButton) {
            //console.log("UPDATED button found!", acceptButton);
            const acceptEh = acceptButton.getAttribute("eh");
            const alert = document.getElementById("new-notice-" + acceptEh) as SlAlert;
            //console.log("UPDATED alert", alert);
            //const declineEh = declineButton.getAttribute("eh");
            //const notice = this._dvm.deliveryZvm.perspective.notices[acceptEh];
            acceptButton.removeEventListener("click", () => {this._dvm.deliveryZvm.acceptDelivery(acceptEh); alert.hide();});
            acceptButton.addEventListener("click", () => {this._dvm.deliveryZvm.acceptDelivery(acceptEh); alert.hide();});
            declineButton.removeEventListener("click", () => {this._dvm.deliveryZvm.declineDelivery(acceptEh); alert.hide();});
            declineButton.addEventListener("click", () => {this._dvm.deliveryZvm.declineDelivery(acceptEh); alert.hide();});
        }
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
    async onSendFile(_e: any): Promise<void> {
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
    toastNotif(notifLog: [Timestamp, FileShareNotificationType, FileShareNotification]): void {
        const type = notifLog[1];

        let msg = "";
        let title = "";
        let variant = "primary";
        let duration = 5000;
        let icon = "info-circle";
        let extraHtml;
        let id;

        if (FileShareNotificationType.ReceptionComplete == type) {
            const manifestEh = (notifLog[2] as FileShareNotificationVariantReceptionComplete).manifestEh;
            //const noticeEh = (notifLog[2] as FileShareNotificationVariantReceptionComplete).noticeEh;
            const privateManifest = this.fileSharePerspective.privateFiles[manifestEh];
            variant = 'success';
            icon = "check2-circle";
            title = "File succesfully received";
            msg = `"${privateManifest.description.name}" (${prettyFileSize(privateManifest.description.size)})`;
        }
        if (FileShareNotificationType.DistributionToRecipientComplete == type) {
            const distribAh = (notifLog[2] as FileShareNotificationVariantDistributionToRecipientComplete).distribAh;
            const recipient = (notifLog[2] as FileShareNotificationVariantDistributionToRecipientComplete).recipient;
            const manifestEh = encodeHashToBase64(this.deliveryPerspective.distributions[distribAh][0].delivery_summary.parcel_reference.eh);
            const privateManifest = this.fileSharePerspective.privateFiles[manifestEh];
            const recipientName = this._profilesZvm.getProfile(recipient).nickname;
            variant = 'success';
            icon = "check2-circle";
            title = "File successfully shared";
            msg = `"${privateManifest.description.name}" to ${recipientName}`;
        }
        if (FileShareNotificationType.PublicSharingComplete == type) {
            const manifestEh = (notifLog[2] as FileShareNotificationVariantPublicSharingComplete).manifestEh;
            const publicManifest = this.fileSharePerspective.localPublicFiles[manifestEh];
            variant = 'success';
            icon = "check2-circle";
            title = "File successfully published";
            msg = `"${publicManifest.description.name}" (${prettyFileSize(publicManifest.description.size)})`;
        }
        if (FileShareNotificationType.PrivateCommitComplete == type) {
            const manifestEh = (notifLog[2] as FileShareNotificationVariantPrivateCommitComplete).manifestEh;
            const privateManifest = this.fileSharePerspective.privateFiles[manifestEh];
            variant = 'success';
            icon = "check2-circle";
            title = "File succesfully added";
            msg = `"${privateManifest.description.name}" (${prettyFileSize(privateManifest.description.size)})`;
        }
        if (FileShareNotificationType.NewNoticeReceived == type) {
            const noticeEh = (notifLog[2] as FileShareNotificationVariantNewNoticeReceived).noticeEh;
            const description = (notifLog[2] as FileShareNotificationVariantNewNoticeReceived).description;
            const recipientName = this._profilesZvm.getProfile((notifLog[2] as FileShareNotificationVariantNewNoticeReceived).sender).nickname;
            title = "Incoming file request";
            msg = `"${description.name}" (${prettyFileSize(description.size)}) from: ${recipientName}`;
            id = "new-notice-" + noticeEh
            duration = Infinity;
            extraHtml = `
                <div>
                    <sl-button id="accept-notice-btn" variant="default" size="small" eh="${noticeEh}">
                      <sl-icon slot="prefix" name="check"></sl-icon>
                      Accept
                    </sl-button>
                    <sl-button id="decline-notice-btn" variant="default" size="small" eh="${noticeEh}">
                      <sl-icon slot="prefix" name="x"></sl-icon>
                      Decline
                    </sl-button>                    
                </div>
            `;
        }
        if (FileShareNotificationType.ReplyReceived == type) {
            const notif = notifLog[2] as FileShareNotificationVariantReplyReceived;
            const distrib = this._dvm.deliveryZvm.perspective.distributions[notif.distribAh][0];
            const description = distrib.delivery_summary.parcel_reference.description;
            const recipientName = this._profilesZvm.getProfile(notif.recipient).nickname;
            if (notif.hasAccepted) {
                title = "File accepted";
            } else {
                title = "File declined";
                variant = 'danger';
                icon = "x-octagon";
            }
            msg = `For "${description.name}" from ${recipientName}`;
        }
        createAlert(title, msg, variant, icon, duration, extraHtml, id);
    }


    /** */
    private onUpload(e: UploadBeforeEvent) {
        console.log('upload-before event: ', e);
        const file = e.detail.file;
        //const xhr = event.detail.xhr;
        console.log("onUpload", file);

        e.preventDefault(); // Prevent the upload request
    }

    /** */
    render() {
        console.log("<file-share-page>.render()", this._initialized, this._dvm.deliveryZvm.perspective, this._profilesZvm.perspective);
        //this.printNoticeReceived();

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


        /** -- Notifications -- */
        const newNotifDiff = this._dvm.perspective.notificationLogs.length - this._notifCount;
        if (newNotifDiff > 0) {
            console.log("New notifications diff:", newNotifDiff);
            for(let i = this._notifCount; i < this._dvm.perspective.notificationLogs.length; i++) {
                const notifLog = this._dvm.perspective.notificationLogs[i];
                console.log("New notifications:", notifLog);
                this.toastNotif(notifLog);
            }
            this._notifCount = this._dvm.perspective.notificationLogs.length;
        }

        /** -- -- */

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
                const [description, _ts, _author] = this._dvm.deliveryZvm.perspective.publicParcels[ppEh];
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
                            <button type="button" @click=${() => {this._dvm.deliveryZvm.acceptDelivery(noticeEh);}}>
                                accept
                            </button>
                            <button type="button" @click=${()=> {this._dvm.deliveryZvm.declineDelivery(noticeEh);}}>
                                decline
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
          Whatever
          ${this.devmode? html`
          <button type="button" @click=${() => {this._dvm.dumpLogs();}}>dump</button>
          <button type="button" @click=${() => {this.refresh();}}>refresh</button>
          `: html``
          }               
        </h1>
         ${this._uploading? html`Uploading... ${Math.ceil(this._dvm.deliveryZvm.perspective.chunkCounts[this._uploading.dataHash] / this._uploading.numChunks * 100)}%` : html`
             <vaadin-upload id="myUpload" nodrop
                            style="width:280px; margin-top:0;"
                            max-file-size="8000000"
                            max-files="10"
                            @file-reject="${(e:UploadFileRejectEvent) => {window.alert(e.detail.file.name + ' error: ' + e.detail.error);}}"
                            @upload-before="${(e:UploadBeforeEvent) => this.onUpload(e)}"
             >
                 <span slot="drop-label">Maximum file size: 8 MB</span>
             </vaadin-upload>
             <div style="margin-bottom: 20px;">
                <sl-button variant="primary">Publish</sl-button>
                <sl-button variant="primary">Send</sl-button>
                <sl-button variant="primary">Add</sl-button>
            </div>
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
        } 

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
        <file-table .items=${Object.entries(this._dvm.fileShareZvm.perspective.privateFiles).map(([eh, pm]) => {return {eh, description: pm.description}})}
                    @download=${(e) => this.downloadFile(e.detail)}
        ></file-table>
        
        
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

        <sl-button @click=${() => this.drawerElem.show()}>Open Activity feed</sl-button>
        
        <sl-drawer id="activityDrawer" label="Activity">
            <activity-timeline></activity-timeline>
            <sl-button slot="footer" variant="primary" @click=${() => this.drawerElem.hide()}>Close</sl-button>
        </sl-drawer>
    `;
    }

}
