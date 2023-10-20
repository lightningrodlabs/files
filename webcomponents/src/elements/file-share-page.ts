import {css, html, TemplateResult} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {Dictionary} from "@ddd-qc/cell-proxy";
import {decodeHashFromBase64, encodeHashToBase64, EntryHashB64, Timestamp,} from "@holochain/client";
import {AppletInfo, WeServices, weServicesContext,} from "@lightningrodlabs/we-applet";
import {consume} from "@lit-labs/context";

import {FileShareDvm} from "../viewModels/fileShare.dvm";
import {FileShareProfile} from "../viewModels/profiles.proxy";
import {ProfilesZvm} from "../viewModels/profiles.zvm";
import {globalProfilesContext} from "../viewModels/happDef";
import {emptyAppletHash, prettyFileSize, prettyTimestamp, SplitObject} from "../utils";
import {DeliveryPerspective, DeliveryStateType, ParcelReference} from "@ddd-qc/delivery";
import {
    FileShareDvmPerspective,
    FileShareNotification,
    FileShareNotificationType,
    FileShareNotificationVariantDeliveryRequestSent,
    FileShareNotificationVariantDistributionToRecipientComplete,
    FileShareNotificationVariantNewNoticeReceived,
    FileShareNotificationVariantPrivateCommitComplete,
    FileShareNotificationVariantPublicSharingComplete,
    FileShareNotificationVariantReceptionComplete,
    FileShareNotificationVariantReplyReceived
} from "../viewModels/fileShare.perspective";
import {createAlert} from "../toast";
import {FileShareMenu, SelectedEvent, SelectedType} from "./file-share-menu";


/** Define my custom elements */
import "./activity-timeline";
import "./file-table";
import "./distribution-table";
import "./file-view";
import "./file-button";
import "./file-share-menu";
import "./action-overlay"
import "./store-dialog";
import "./send-dialog";
import "./edit-profile";
import "./profile-item";
import "./profile-input";
import "./inbound-stack";
import "./tag-input";
import "./tag-list";

import {SlAlert, SlBadge, SlButton, SlDialog, SlInput} from "@shoelace-style/shoelace";

import "@shoelace-style/shoelace/dist/components/avatar/avatar.js";
import "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/badge/badge.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/card/card.js";
import "@shoelace-style/shoelace/dist/components/dialog/dialog.js";
import "@shoelace-style/shoelace/dist/components/divider/divider.js";
import "@shoelace-style/shoelace/dist/components/drawer/drawer.js";
import "@shoelace-style/shoelace/dist/components/details/details.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";
import "@shoelace-style/shoelace/dist/components/input/input.js";
import "@shoelace-style/shoelace/dist/components/menu/menu.js";
import "@shoelace-style/shoelace/dist/components/menu-item/menu-item.js";
import "@shoelace-style/shoelace/dist/components/progress-bar/progress-bar.js";
import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";
import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
import "@shoelace-style/shoelace/dist/components/tooltip/tooltip.js";

//import {Upload, UploadBeforeEvent, UploadFileRejectEvent} from "@vaadin/upload";
// import {UploadFile} from "@vaadin/upload/src/vaadin-upload";
import '@vaadin/multi-select-combo-box/theme/lumo/vaadin-multi-select-combo-box.js';
import '@vaadin/combo-box/theme/lumo/vaadin-combo-box.js';
import '@vaadin/grid/theme/lumo/vaadin-grid.js';
import '@vaadin/grid/theme/lumo/vaadin-grid-selection-column.js';
import '@vaadin/upload/theme/lumo/vaadin-upload.js';


import {FileTableItem} from "./file-table";
import {sharedStyles} from "../sharedStyles";
import {DistributionStateType} from "@ddd-qc/delivery/dist/bindings/delivery.types";
import {StoreDialog} from "./store-dialog";
import {SendDialog} from "./send-dialog";
import {DistributionTableItem} from "./distribution-table";
import {columnBodyRenderer} from "@vaadin/grid/lit";
import {ActionOverlay} from "./action-overlay";
import {countFileTypes, FileType, kind2Type, type2Icon} from "../fileTypeUtils";


export const REPORT_BUG_URL = `https://github.com/lightningrodlabs/file-share/issues/new`;

/**
 * @element
 */
@customElement("file-share-page")
export class FileSharePage extends DnaElement<FileShareDvmPerspective, FileShareDvm> {

    // constructor() {
    //     super(FileShareDvm.DEFAULT_BASE_ROLE_NAME);
    //       this.addEventListener('beforeunload', (e) => {
    //         console.log("<file-share-page> beforeunload", e);
    //     });
    // }

    /** -- Fields -- */
    @state() private _initialized = false;
    @property() appletHash: EntryHashB64;

    @property() devmode: boolean = false;

    @property() offlineloaded: boolean = false;


    private _typeFilter?: FileType;

    private _notifCount = 0;

    /** Observed perspective from zvm */
    @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
    deliveryPerspective!: DeliveryPerspective;

    @consume({ context: globalProfilesContext, subscribe: true })
    _profilesZvm!: ProfilesZvm;

    @consume({ context: weServicesContext, subscribe: true })
    weServices!: WeServices;

    private _myProfile: FileShareProfile = {nickname: "unknown", fields: {}}


    /** AppletId -> AppletInfo */
    @state() private _appletInfos: Dictionary<AppletInfo> = {}

    @state() private _selectedMenuItem?: SelectedEvent = {type: SelectedType.Home}


    /** -- Getters -- */

    get profileDialogElem(): SlDialog {
        return this.shadowRoot!.getElementById("profile-dialog") as SlDialog;
    }

    get actionOverlayElem() : ActionOverlay {
        return this.shadowRoot.querySelector("action-overlay") as ActionOverlay;
    }

    get storeDialogElem() : StoreDialog {
        return this.shadowRoot.querySelector("store-dialog") as StoreDialog;
    }
    get sendDialogElem() : SendDialog {
        return this.shadowRoot.querySelector("send-dialog") as SendDialog;
    }

    get searchInputElem() : SlInput {
        return this.shadowRoot.getElementById("search-input") as SlInput;
    }

    get menuElem() : FileShareMenu {
        return this.shadowRoot.querySelector("file-share-menu") as FileShareMenu;
    }


    get fabElem() : SlButton {
        return this.shadowRoot.getElementById("fab-publish") as SlButton;
    }


    /** -- Methods -- */

    /**
     * In dvmUpdated() this._dvm is not already set!
     * Subscribe to ZVMs
     */
    protected async dvmUpdated(newDvm: FileShareDvm, oldDvm?: FileShareDvm): Promise<void> {
        console.log("<file-view>.dvmUpdated()");
        if (oldDvm) {
            console.log("\t Unsubscribed to Zvms roleName = ", oldDvm.fileShareZvm.cell.name)
            //oldDvm.fileShareZvm.unsubscribe(this);
            oldDvm.deliveryZvm.unsubscribe(this);
        }
        newDvm.deliveryZvm.subscribe(this, 'deliveryPerspective');
        console.log("\t Subscribed Zvms roleName = ", newDvm.fileShareZvm.cell.name);
        this._initialized = true;
    }


    /** After first render only */
    async firstUpdated() {
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
            let res = await this._dvm.startCommitPrivateFile(fileInput.files[0], []);
            console.log("onAddFile() res:", res);
            fileInput.value = "";
            return res;
        }
    }


    // /** */
    // async onPublishFile(): Promise<SplitObject | undefined> {
    //     const fileInput = this.shadowRoot!.getElementById("publishFile") as HTMLInputElement;
    //     console.log("onPublishFile():", fileInput.files.length);
    //     const splitObj = await this._dvm.startPublishFile(fileInput.files[0]);
    //     console.log("onPublishFile() splitObj:", splitObj);
    //     fileInput.value = "";
    //     return splitObj;
    // }


    // /** */
    // async onSendFile(_e: any): Promise<void> {
    //     const localFileInput = this.shadowRoot!.getElementById("localFileSelector") as HTMLSelectElement;
    //     const agentSelect = this.shadowRoot!.getElementById("recipientSelector") as HTMLSelectElement;
    //     console.log("onSendFile():", localFileInput.value, agentSelect.value);
    //     let distribAh = await this._dvm.fileShareZvm.sendFile(localFileInput.value, agentSelect.value);
    //     console.log("onSendFile() distribAh:", distribAh);
    //     localFileInput.value = "";
    // }


    /** */
    async refresh() {
        await this._dvm.probeAll();
        await this._dvm.fileShareZvm.zomeProxy.getPrivateFiles();
        await this._dvm.deliveryZvm.queryAll();
        this.requestUpdate();
    }


    /** */
    async downloadFile(manifestEh: EntryHashB64): Promise<void> {
        console.log("downloadFile()", manifestEh);
        const file = await this._dvm.localParcel2File(manifestEh);
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name || 'download';
        a.addEventListener('click', () => {}, false);
        a.click();
    }


    /** */
    printNoticeReceived() {
        for (const [distribAh, acks] of Object.entries(this.deliveryPerspective.noticeAcks)) {
            console.log(` - "${distribAh}": distrib = "${distribAh}"; recipients = "${Object.keys(acks)}"`)
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

        if (FileShareNotificationType.DeliveryRequestSent == type) {
            const manifestEh = (notifLog[2] as FileShareNotificationVariantDeliveryRequestSent).manifestEh;
            const privateManifest = this.deliveryPerspective.privateManifests[manifestEh][0];
            const recipients = (notifLog[2] as FileShareNotificationVariantDeliveryRequestSent).recipients;
            let recipientName = "" + recipients.length + " peers";
            if (recipients.length == 1) {
                const maybeProfile = this._profilesZvm.getProfile(recipients[0]);
                recipientName = maybeProfile ? maybeProfile.nickname : "unknown";
            }
            console.log("DeliveryRequestSent", notifLog, recipients, recipientName);
            variant = 'success';
            icon = "check2-circle";
            title = "File delivery request sent";
            msg = `"${privateManifest.description.name}" to ${recipientName}`;
        }
        if (FileShareNotificationType.ReceptionComplete == type) {
            const manifestEh = (notifLog[2] as FileShareNotificationVariantReceptionComplete).manifestEh;
            //const noticeEh = (notifLog[2] as FileShareNotificationVariantReceptionComplete).noticeEh;
            const privateManifest = this.deliveryPerspective.privateManifests[manifestEh][0];
            variant = 'success';
            icon = "check2-circle";
            title = "File succesfully received";
            msg = `"${privateManifest.description.name}" (${prettyFileSize(privateManifest.description.size)})`;
        }
        if (FileShareNotificationType.DistributionToRecipientComplete == type) {
            const distribAh = (notifLog[2] as FileShareNotificationVariantDistributionToRecipientComplete).distribAh;
            const recipient = (notifLog[2] as FileShareNotificationVariantDistributionToRecipientComplete).recipient;
            const manifestEh = encodeHashToBase64(this.deliveryPerspective.distributions[distribAh][0].delivery_summary.parcel_reference.eh);
            const privateManifest = this.deliveryPerspective.privateManifests[manifestEh][0];
            const maybeProfile = this._profilesZvm.getProfile(recipient);
            const recipientName = maybeProfile? maybeProfile.nickname : "unknown";
            variant = 'success';
            icon = "check2-circle";
            title = "File successfully shared";
            msg = `"${privateManifest.description.name}" to ${recipientName}`;
        }
        if (FileShareNotificationType.PublicSharingComplete == type) {
            const manifestEh = (notifLog[2] as FileShareNotificationVariantPublicSharingComplete).manifestEh;
            const publicManifest = this.deliveryPerspective.localPublicManifests[manifestEh][0];
            variant = 'success';
            icon = "check2-circle";
            title = "File successfully published";
            msg = `"${publicManifest.description.name}" (${prettyFileSize(publicManifest.description.size)})`;
            /** Notify peers that we published something */
            const pr = {description: publicManifest.description, eh: decodeHashFromBase64(manifestEh)} as ParcelReference;
            const timestamp = notifLog[0];
            const peers = this._profilesZvm.getAgents().map((peer) => decodeHashFromBase64(peer));
            console.log("PublicSharingComplete. notifying...", peers);
            this._dvm.deliveryZvm.zomeProxy.notifyNewPublicParcel({peers, timestamp, pr});
        }
        if (FileShareNotificationType.PrivateCommitComplete == type) {
            const manifestEh = (notifLog[2] as FileShareNotificationVariantPrivateCommitComplete).manifestEh;
            const privateManifest = this.deliveryPerspective.privateManifests[manifestEh][0];
            variant = 'success';
            icon = "check2-circle";
            title = "File succesfully added";
            msg = `"${privateManifest.description.name}" (${prettyFileSize(privateManifest.description.size)})`;
        }
        if (FileShareNotificationType.NewNoticeReceived == type) {
            const noticeEh = (notifLog[2] as FileShareNotificationVariantNewNoticeReceived).noticeEh;
            const description = (notifLog[2] as FileShareNotificationVariantNewNoticeReceived).description;
            const recipient = (notifLog[2] as FileShareNotificationVariantNewNoticeReceived).sender;
            const maybeProfile = this._profilesZvm.getProfile(recipient);
            const recipientName = maybeProfile? maybeProfile.nickname : "unknown";
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
            const distrib = this.deliveryPerspective.distributions[notif.distribAh][0];
            const description = distrib.delivery_summary.parcel_reference.description;
            const maybeProfile = this._profilesZvm.getProfile(notif.recipient);
            const recipientName = maybeProfile? maybeProfile.nickname : "unknown";
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
    private async onSaveProfile(profile: FileShareProfile) {
        console.log("onSavProfile()", this._myProfile)
        try {
            await this._profilesZvm.updateMyProfile(profile);
        } catch(e) {
            await this._profilesZvm.createMyProfile(profile);
            this._myProfile = profile;
        }
        this.profileDialogElem.open = false;
        this._myProfile.fields.avatar = profile.fields.avatar;
        this.requestUpdate();
    }


    /** */
    onCardClick(type: FileType) {
        console.log("onCardClick()", this.menuElem, type);
        this.menuElem.setSelected(SelectedType.AllFiles);
        this._typeFilter = type;
        this._selectedMenuItem = {type: SelectedType.AllFiles};
    }


    /** */
    renderHome(unrepliedInbounds) {
        const initialized = !!(this._initialized && this.deliveryPerspective.probeDhtCount);

        /** Count files per type */
        const privDescriptions = Object.values(this.deliveryPerspective.privateManifests)
            .map(([manifest, _ts]) => manifest.description);
        const pubDescriptions = Object.values(this.deliveryPerspective.publicParcels)
            .map(([pd, _ts, _agent]) => pd);

        let countMap: Record<string, number>;
        if (initialized) {
            countMap = countFileTypes(privDescriptions.concat(pubDescriptions));
        }

        /** */
        return html`
            <!-- File type cards -->            
            <div id="card-row">
                <div class="card" @click=${(e) => {this.onCardClick(FileType.Document)}}>
                    <sl-icon name=${type2Icon(FileType.Document)}></sl-icon>
                    <div>Documents</div>
                    ${initialized? html`<div class="subtext">${countMap[FileType.Document]} Files</div>`: html`<sl-skeleton effect="pulse"></sl-skeleton>`}
                </div>                
                <div class="card" @click=${(e) => {this.onCardClick(FileType.Image)}}>
                    <sl-icon name=${type2Icon(FileType.Image)}></sl-icon>
                    <div>Images</div>
                    ${initialized? html`<div class="subtext">${countMap[FileType.Image]} Files</div>`: html`<sl-skeleton effect="pulse"></sl-skeleton>`}
                </div>
                <div class="card" @click=${(e) => {this.onCardClick(FileType.Video)}}>
                    <sl-icon name=${type2Icon(FileType.Video)}></sl-icon>
                    <div>Video</div>
                    ${initialized? html`<div class="subtext">${countMap[FileType.Video]} Files</div>`: html`<sl-skeleton effect="pulse"></sl-skeleton>`}
                </div>
                <div class="card" @click=${(e) => {this.onCardClick(FileType.Audio)}}>
                    <sl-icon name=${type2Icon(FileType.Audio)}></sl-icon>
                    <div>Audio</div>
                    ${initialized? html`<div class="subtext">${countMap[FileType.Audio]} Files</div>`: html`<sl-skeleton effect="pulse"></sl-skeleton>`}
                </div>
                <div class="card" @click=${(e) => {this.onCardClick(FileType.Zip)}}>
                    <sl-icon name=${type2Icon(FileType.Zip)}></sl-icon>
                    <div>Zip Files</div>
                    ${initialized? html`<div class="subtext">${countMap[FileType.Zip]} Files</div>`: html`<sl-skeleton effect="pulse"></sl-skeleton>`}
                </div>                
            </div>
            <!-- Incoming file requests -->        
            ${unrepliedInbounds.length? html`
                <h2>Incoming file requests</h2>
                <ul>${unrepliedInbounds}</ul>
            ` : html``}
            <!-- Recent Activity -->
            <h2>Recent Activity</h2>
            <activity-timeline @download=${(e) => this.downloadFile(e.detail)} @send=${(e) => this.sendDialogElem.open(e.detail)}></activity-timeline>`;
    }


    /** */
    render() {
        console.log("<file-share-page>.render()", this._initialized, this.offlineloaded, this.deliveryPerspective.probeDhtCount, this._selectedMenuItem, this.deliveryPerspective, this._profilesZvm.perspective);

        if (!this._profilesZvm) {
            console.error("this._profilesZvm not found");
            return html`<sl-spinner class="missing-profiles"></sl-spinner>`;
        }

        this._myProfile = this._profilesZvm.getMyProfile();
        if (!this._myProfile) {
            this._myProfile = { nickname: "guest_" + Math.floor(Math.random() * 100), fields: {}};
            this._profilesZvm.createMyProfile(this._myProfile).then(() => this.requestUpdate());
        }

        /** This agent's profile info */
        let agent = {nickname: "unknown", fields: {}} as FileShareProfile;
        let maybeAgent = this._myProfile;
        if (maybeAgent) {
            agent = maybeAgent;
        } else {
            //console.log("Profile not found for", texto.author, this._dvm.profilesZvm.perspective.profiles)
            this._profilesZvm.probeProfile(this._dvm.cell.agentPubKey);
            //.then((profile) => {if (!profile) return; console.log("Found", profile.nickname)})
        }

        //const initials = getInitials(agent.nickname);
        const avatarUrl = agent.fields['avatar'];

        let searchResultItems = [];
        /** Search results */
        if (this.searchInputElem) {
            const filter = this.searchInputElem.value.toLowerCase();
            const results = this._dvm.searchParcel(filter);
            console.log("searchInputElem", filter, results);
            searchResultItems = results.map((ppEh) => html`
                <file-button    hash="${ppEh}"
                                @download=${(e) => this.downloadFile(e.detail)}
                                @send=${(e) => this.sendDialogElem.open(e.detail)}
                ></file-button>
            `);
        }


        /** -- Notifications -- */
        const newNotifDiff = this.perspective.notificationLogs.length - this._notifCount;
        if (newNotifDiff > 0) {
            console.log("New notifications diff:", newNotifDiff);
            for(let i = this._notifCount; i < this.perspective.notificationLogs.length; i++) {
                const notifLog = this.perspective.notificationLogs[i];
                console.log("New notifications:", notifLog);
                this.toastNotif(notifLog);
            }
            this._notifCount = this.perspective.notificationLogs.length;
        }

        /** -- -- */


        const agentOptions = Object.entries(this._profilesZvm.perspective.profiles).map(
            ([agentIdB64, profile]) => {
                //console.log("" + index + ". " + agentIdB64)
                return html `<option value="${agentIdB64}">${profile.nickname}</option>`
            }
        )

        console.log("localFiles found:", Object.entries(this.deliveryPerspective.privateManifests).length);

        const fileOptions = Object.entries(this.deliveryPerspective.privateManifests).map(
            ([eh, [manifest, _ts]]) => {
                //console.log("" + index + ". " + agentIdB64)
                return html `<option value="${eh}">${manifest.description.name}</option>`
            }
        )


        /** Unreplied inbounds */
        let unrepliedInbounds: TemplateResult<1>[] = [];
        let inboundList = Object.entries(this._dvm.deliveryZvm.inbounds()).map(
            ([noticeEh, [notice, ts, pct]]) => {
                console.log("" + noticeEh, this.deliveryPerspective.notices[noticeEh]);
                const senderKey = encodeHashToBase64(notice.sender);
                const senderProfile = this._profilesZvm.getProfile(senderKey);
                let sender = senderKey;
                if (senderProfile) {
                    sender = senderProfile.nickname;
                }
                if (pct == -1) {
                    const unrepliedLi = html`
                        <li id="inbound_${noticeEh}">
                            <span class="nickname">${sender}</span>
                            wants to send you 
                            <span style="font-weight: bold">${notice.summary.parcel_reference.description.name}</span>
                            (${prettyFileSize(notice.summary.parcel_reference.description.size)})
                            <div style="margin: 10px 10px 20px 20px;">
                                <sl-button type="button" variant="default" @click=${() => {this._dvm.deliveryZvm.acceptDelivery(noticeEh);}}>
                                    <sl-icon slot="prefix" name="check"></sl-icon>
                                    Accept
                                </sl-button>
                                <sl-button type="button" variant="default" @click=${()=> {this._dvm.deliveryZvm.declineDelivery(noticeEh);}}>
                                    <sl-icon slot="prefix" name="x"></sl-icon>
                                    Decline
                                </sl-button>
                            </divstyle>
                        </li>`
                    unrepliedInbounds.push(unrepliedLi);
                    return unrepliedLi;
                } else {
                    return html`<li id="inbound_${noticeEh}">
                        <span class="nickname">${sender}</span>
                        wants to send you
                        <span style="font-weight: bold">${notice.summary.parcel_reference.description.name}</span>
                        (${prettyFileSize(notice.summary.parcel_reference.description.size)})
                        <button type="button" @click=${() => {this._dvm.deliveryZvm.zomeProxy.requestMissingChunks(notice.summary.parcel_reference.eh)}}>resume</button>
                        <sl-progress-bar .value=${pct} style="margin-top:5px; width: 50%">${pct}%</sl-progress-bar>
                    </li>`;
                }
            });

        /** Unreplied outbounds */
        let outboundList = Object.entries(this._dvm.deliveryZvm.outbounds())
            .map(([_distribAh, [distribution, ts, deliveryStates]]) => {
                const outboundItems = Object.entries(deliveryStates).map(
                    ([recipient, state]) => {
                        return {
                            distribution,
                            recipient,
                            timestamp: ts,
                            state,
                        }
                });
                return outboundItems;
            })
            .flat();

        let outboundTable = html`
                    <vaadin-grid .items="${outboundList}">
                        <vaadin-grid-column path="distribution" header="Filename"
                                            ${columnBodyRenderer(
                                                    ({ distribution }) => html`<span>${distribution.delivery_summary.parcel_reference.description.name}</span>`,
                                                    [],
                                            )}>
                        </vaadin-grid-column>                        
                        <vaadin-grid-column path="recipient" header="Recipient"
                                            ${columnBodyRenderer(
                                                    ({ recipient }) => {
                                                        const maybeProfile = this._profilesZvm.perspective.profiles[recipient];
                                                        return maybeProfile
                                                                ? html`<span>${maybeProfile.nickname}</span>`
                                                                : html`<sl-skeleton effect="sheen"></sl-skeleton>`
                                                    },
                                                    [],
                                            )}
                        ></vaadin-grid-column>                        
                        <vaadin-grid-column path="state" header="State"
                            ${columnBodyRenderer(
                            ({ state }) => {
                                if (DeliveryStateType.Unsent in state) {
                                    return html`<span>Delivery notice unsent</span>`
                                }
                                if (DeliveryStateType.PendingNotice in state) {
                                    return html`<span>Delivery notice pending reception</span>`
                                }
                                if (DeliveryStateType.NoticeDelivered in state) {
                                    return html`<span>Waiting for reply</span>`
                                }
                                return html`<span>Unknown</span>`
                            },
                            [],
                        )}>
                        </vaadin-grid-column>
                        <vaadin-grid-column path="timestamp" header="Sent Date"
                                            ${columnBodyRenderer(
                                                    ({ timestamp }) => html`<span>${prettyTimestamp(timestamp)}</span>`,
                                                    [],
                                            )}
                        ></vaadin-grid-column>                        
                    </vaadin-grid>
                `;

        /** Incomplete manifests (inbound pending) */
        let incompleteList = this.deliveryPerspective.incompleteManifests
            .map((manifestEh) => {
                const pair = this.deliveryPerspective.privateManifests[manifestEh];
                if (!pair) {
                    console.warn("Manifest not found for incomplete manifest:", manifestEh)
                    return {};
                };
                let noticeTuple;
                for (const tuple of Object.values(this.deliveryPerspective.notices)) {
                    if (encodeHashToBase64(tuple[0].summary.parcel_reference.eh) == manifestEh) {
                        noticeTuple = tuple;
                        break;
                    }
                }
                if (!noticeTuple) {
                    console.warn("Notice not found for incomplete manifest:", manifestEh)
                    return {};
                };
                return {
                    notice: noticeTuple[0],
                    timestamp: noticeTuple[1],
                    pct: noticeTuple[3],
                }
            });
        let incompleteTable = html`
                    <vaadin-grid .items="${incompleteList}">
                        <vaadin-grid-column path="notice" header="Filename"
                                            ${columnBodyRenderer(
            ({ notice }) => html`<span>${notice.summary.parcel_reference.description.name}</span>`,
            [],
        )}>
                        </vaadin-grid-column>                        
                        <vaadin-grid-column path="notice" header="Sender"
                                            ${columnBodyRenderer(
            ({ notice }) => {
                const sender = encodeHashToBase64(notice.sender);
                const maybeProfile = this._profilesZvm.perspective.profiles[sender];
                return maybeProfile
                    ? html`<span>${maybeProfile.nickname}</span>`
                    : html`<sl-skeleton effect="sheen"></sl-skeleton>`
            },
            [],
        )}
                        ></vaadin-grid-column>                        
                        <vaadin-grid-column path="pct" header="State"
                            ${columnBodyRenderer(({ pct }) => {return html`<sl-progress-bar value=${pct}></sl-progress-bar>`},
                [],
                        )}>
                        </vaadin-grid-column>
                        <vaadin-grid-column path="timestamp" header="Sent Date"
                                            ${columnBodyRenderer(
            ({ timestamp }) => html`<span>${prettyTimestamp(timestamp)}</span>`,
            [],
        )}
                        ></vaadin-grid-column>                        
                    </vaadin-grid>
                `;


        /** Choose what to display */
        let mainArea = html`
            <h2>Recent Activity</h2>
            <sl-skeleton effect="sheen" style="margin:15px; width: 30%; height: 24px;"></sl-skeleton>
            <sl-skeleton effect="sheen" style="margin:15px; width: 30%; height: 24px;"></sl-skeleton>
            <sl-skeleton effect="sheen" style="margin:15px; width: 30%; height: 24px;"></sl-skeleton>
            `;
        if (this._selectedMenuItem && this.deliveryPerspective.probeDhtCount) {
            console.log("_selectedMenuItem", this._selectedMenuItem)

            if (this._selectedMenuItem.type == SelectedType.Home) {
                mainArea = this.renderHome(unrepliedInbounds);
            }
            if (this._selectedMenuItem.type == SelectedType.AllFiles) {
                const privateItems = Object.entries(this.deliveryPerspective.privateManifests)
                    .filter(([_ppEh, [manifest, _ts]]) => {
                        const type = kind2Type(manifest.description.kind_info);
                        return !this._typeFilter
                            || this._typeFilter == type
                            || (this._typeFilter == FileType.Document && (type == FileType.Text || type == FileType.Pdf))
                    })
                    .map(([ppEh, [pm, timestamp]]) => {
                    //const timestamp = this.deliveryPerspective.privateManifests[ppEh][1];
                    return {
                        ppEh,
                        description: pm.description,
                        timestamp,
                        author: this.cell.agentPubKey,
                        isLocal: true,
                        isPrivate: true
                    } as FileTableItem;
                });
                // const myPublicItems = Object.entries(this.deliveryPerspective.localPublicManifests).map(([ppEh, [pm, timestamp]]) => {
                //     //const timestamp = this.deliveryPerspective.localPublicManifests[ppEh][1];
                //     return {pp_eh: decodeHashFromBase64(ppEh), description: pm.description, timestamp, author: this.cell.agentPubKey, isLocal: true, isPrivate: false} as FileTableItem;
                // });
                const publicItems = Object.entries(this.deliveryPerspective.publicParcels)
                    .filter(([_ppEh, [description, _ts, _author]]) => {
                        const type = kind2Type(description.kind_info);
                        return !this._typeFilter
                            || this._typeFilter == type
                            || (this._typeFilter == FileType.Document && (type == FileType.Text || type == FileType.Pdf))
                    })
                    .map(([ppEh, [description, timestamp, author]]) => {
                    //const [description, timestamp, author] = this.deliveryPerspective.publicParcels[ppEh];
                    const isLocal = !!this.deliveryPerspective.localPublicManifests[ppEh];
                    return {ppEh, description, timestamp, author, isLocal, isPrivate: false} as FileTableItem;
                });
                const allItems = privateItems.concat(publicItems/*, myPublicItems*/);
                mainArea = html`
                    <h2>All Files</h2>
                    <file-table .items=${allItems}
                                @download=${(e) => this.downloadFile(e.detail)}
                                @send=${(e) => this.sendDialogElem.open(e.detail)}
                    ></file-table>
                `;
            }
            if (this._selectedMenuItem.type == SelectedType.PersonalFiles) {
                mainArea = html`
                    <h2>${SelectedType.PersonalFiles}</h2>
                    <file-table
                            .items=${Object.entries(this.deliveryPerspective.privateManifests).map(([ppEh, [pm, timestamp]]) => {
                                //const timestamp = this.deliveryPerspective.privateManifests[ppEh][1];
                                return {ppEh, description: pm.description, timestamp} as FileTableItem;
                            })}
                            @download=${(e) => this.downloadFile(e.detail)}
                            @send=${(e) => this.sendDialogElem.open(e.detail)}
                    ></file-table>
                `;
            }
            if (this._selectedMenuItem.type == SelectedType.GroupFiles) {
                // console.log("this.deliveryPerspective.localPublicManifests", this.deliveryPerspective.localPublicManifests)
                // const myPublicItems = Object.entries(this.deliveryPerspective.localPublicManifests).map(([ppEh, [pm, timestamp]]) => {
                //     //const timestamp = this.deliveryPerspective.localPublicManifests[ppEh][1];
                //     return {pp_eh: decodeHashFromBase64(ppEh), description: pm.description, timestamp, author: this.cell.agentPubKey, isLocal: true} as FileTableItem;
                // });
                const dhtPublicItems = Object.entries(this.deliveryPerspective.publicParcels).map(([ppEh, [description, timestamp, author]]) => {
                    //const [description, timestamp, author] = this.deliveryPerspective.publicParcels[ppEh];
                    const isLocal = !!this.deliveryPerspective.localPublicManifests[ppEh];
                    return {ppEh, description, timestamp, author, isLocal} as FileTableItem;
                });
                //const publicItems = dhtPublicItems.concat(myPublicItems);

                mainArea = html`
                    <h2>${SelectedType.GroupFiles}</h2>
                    <file-table .items=${dhtPublicItems}
                                @download=${(e) => this.downloadFile(e.detail)}
                                @send=${(e) => this.sendDialogElem.open(e.detail)}
                    ></file-table>
                `;
            }

            if (this._selectedMenuItem.type == SelectedType.Inbox) {
                mainArea = html`
                    <h2>Inbound files</h2>
                    <ul>
                        ${inboundList}
                    </ul>`;
            }
            if (this._selectedMenuItem.type == SelectedType.Sent) {
                let distributionItems = Object.entries(this.deliveryPerspective.distributions)
                    .filter(([_distribAh, tuple]) => DistributionStateType.AllAcceptedParcelsReceived in tuple[2])
                    .map(([distribAh, [distribution, sentTs, _fullState, _stateMap]]) => {
                        const description = distribution.delivery_summary.parcel_reference.description;
                        const ppEh = encodeHashToBase64(distribution.delivery_summary.parcel_reference.eh);
                        let items: DistributionTableItem[] = []
                        for (const recipientHash of distribution.recipients) {
                            const recipient = encodeHashToBase64(recipientHash);
                            let receptionTs = 0;
                            let deliveryState = DeliveryStateType.ParcelRefused;
                            /** If recipient refused, no receptionAck should be found */
                            if (this.deliveryPerspective.receptionAcks[distribAh] && this.deliveryPerspective.receptionAcks[distribAh][recipient]) {
                                const [_receptionAck, receptionTs2] = this.deliveryPerspective.receptionAcks[distribAh][recipient];
                                receptionTs = receptionTs2;
                                deliveryState = DeliveryStateType.ParcelDelivered;
                            }
                            items.push({
                                distribAh,
                                recipient,
                                deliveryState,
                                ppEh,
                                description,
                                sentTs,
                                receptionTs,
                            } as DistributionTableItem);
                        }
                        return items;
                    })
                    .flat()
                    .sort((a, b) => b.sentTs - a.sentTs);
                mainArea = html`
                    <h2>Sent</h2>
                    <distribution-table .items=${distributionItems}
                                        @download=${(e) => this.downloadFile(e.detail)}
                                        @send=${(e) => this.sendDialogElem.open(e.detail)}
                    ></distribution-table>
                `;
            }
            if (this._selectedMenuItem.type == SelectedType.InProgress) {
                mainArea = html`
                    <h2>Outbound files</h2>
                    <ul>
                        ${outboundTable}
                    </ul>
                    <h2>Incomplete files</h2>
                    <ul>
                        ${incompleteTable}
                    </ul>\`;                    
                `;

            }
            if (this._selectedMenuItem.type == SelectedType.PublicTag) {
                const taggedItems = Object.entries(this.deliveryPerspective.publicParcels)
                    .map(([ppEh, [description, timestamp, author]]) => {
                        const isLocal = !!this.deliveryPerspective.localPublicManifests[ppEh];
                        return {ppEh, description, timestamp, author, isLocal} as FileTableItem;
                    })
                    .filter((item) => {
                        const publicTags = this._dvm.taggingZvm.perspective.publicTagsByTarget[item.ppEh];
                        return publicTags && publicTags.includes(this._selectedMenuItem.tag);
                    });
                mainArea = html`
                    <h2>${this._selectedMenuItem.tag}</h2>
                    <file-table .items=${taggedItems}
                                @download=${(e) => this.downloadFile(e.detail)}
                                @send=${(e) => this.sendDialogElem.open(e.detail)}
                    ></file-table>                    
                `;
            }
            if (this._selectedMenuItem.type == SelectedType.PrivateTag) {
                const taggedItems = Object.entries(this.deliveryPerspective.privateManifests).map(([ppEh, [pm, timestamp]]) => {
                    //const timestamp = this.deliveryPerspective.privateManifests[ppEh][1];
                    return {ppEh, description: pm.description, timestamp} as FileTableItem;
                })
                .filter((item) => {
                    const tags = this._dvm.taggingZvm.perspective.privateTagsByTarget[item.ppEh];
                    return tags && tags.includes(this._selectedMenuItem.tag);
                });

                mainArea = html`
                    <h2>${this._selectedMenuItem.tag}</h2>
                    <file-table .items=${taggedItems}
                                @download=${(e) => this.downloadFile(e.detail)}
                                @send=${(e) => this.sendDialogElem.open(e.detail)}
                    ></file-table>
                `;
            }
        }


        /** Render all */
        return html`
        <div id="main">
            <file-share-menu @selected=${(e) => {this._selectedMenuItem = e.detail; this._typeFilter = undefined;}}></file-share-menu>
            <div id="rhs">
                <div id="topBar">
                    <sl-tooltip placement="bottom-end" content=${this._myProfile.nickname} style="--show-delay: 400;">
                        <sl-avatar
                                style="cursor:pointer"
                                label=${this._myProfile.nickname}
                                image=${avatarUrl}
                                @click=${() => this.profileDialogElem.open = true}></sl-avatar>
                    </sl-tooltip>
                    <sl-button class="top-btn" variant="default" size="medium" href=${REPORT_BUG_URL}>
                        <sl-icon name="bell" label="notifications"></sl-icon>
                    </sl-button>
                    <sl-button class="top-btn" variant="default" size="medium" href=${REPORT_BUG_URL}>
                        <sl-icon name="bug" label="Report bug"></sl-icon>
                    </sl-button>
                    ${this.devmode? html`
                        <button type="button" @click=${() => {this._dvm.dumpLogs();}}>dump</button>
                        <button type="button" @click=${() => {this.refresh();}}>refresh</button>
                    `: html``
                    }
                    <sl-input id="search-input" placeholder="Search" size="large" clearable
                              @sl-input=${(e) => {console.log("sl-change", this.searchInputElem.value);this.requestUpdate();}}
                              style="flex-grow: 2">
                        <sl-icon name="search" slot="prefix"></sl-icon>
                    </sl-input>
                </div>
                <div id="mainArea">
                    ${mainArea}
                </div>
            </div>
        </div>
        <!-- Search result -->
        <div id="searchResultView" style="display:${searchResultItems.length? "flex" :"none"}">
            ${searchResultItems}
        </div>
        <!-- dialogs -->
        <sl-dialog id="profile-dialog" label="Edit Profile">
            <edit-profile
                    allowCancel
                    .profile="${this._myProfile}"
                    @save-profile=${(e: CustomEvent) => this.onSaveProfile(e.detail.profile)}
            ></edit-profile>
        </sl-dialog>
        <action-overlay 
                @sl-after-hide=${(e) => {this.fabElem.style.display = "block"}}
                @selected=${(e) => {
            if (e.detail == "send") {
                this.sendDialogElem.open();
            }
            if (e.detail == "publish") {
                this.storeDialogElem.open(false);
            }
            if (e.detail == "add") {
                this.storeDialogElem.open(true);
            }
        }}></action-overlay>
        <store-dialog></store-dialog>
        <send-dialog></send-dialog>
        <!-- stack -->
        <inbound-stack></inbound-stack>
        <!-- commit button & panel -->
        ${this.perspective.uploadState? html`
            <div id="uploadingView">
                <span style="font-weight: bold; overflow:clip; width:inherit; margin-right:3px;">${this.perspective.uploadState.file.name}</span>
                <sl-icon style="margin-right:3px;" name="arrow-right"></sl-icon><sl-icon name="hdd"></sl-icon>
                <sl-progress-bar .value=${Math.ceil(this.perspective.uploadState.chunks.length / this.perspective.uploadState.splitObj.numChunks * 100)}></sl-progress-bar>
            </div>
            ` : html`
            <sl-tooltip placement="left" content="Send/Share file" style="--show-delay: 200;">
                <sl-button id="fab-publish" size="large" variant="primary" circle
                           ?disabled=${this.perspective.uploadState}  
                           @click=${(_e) => {this.actionOverlayElem.open(); this.fabElem.style.display = "none"}}>
                    <sl-icon name="plus-lg" label="Add"></sl-icon>
                </sl-button>
            </sl-tooltip>
        `}

        `;
    }


    /** */
    static get styles() {
        return [
            sharedStyles,
            css`
              :host {
                display: block;
                height: 100vh;
              }
              #main {
                background: #F7FBFE;
                display: flex;
                height: inherit;
                flex-direction: row;
                padding: 15px 10px 10px 15px;
              }
              file-share-menu {
                width: 300px;
              }
              #mainArea {
                display: flex;
                flex-direction: column;
                height: 100%;
              }
              #rhs {
                width: 100%;
                margin: 5px;
                margin-left: 30px;
              }
              #topBar {
                display: flex;
                flex-direction: row-reverse;
                gap: 5px;
              }
              .top-btn::part(base) {
                background: #E9F0F3;
                font-size: 20px;
                width: 40px;
              }
              #card-row {
                margin-top: 20px;
                display: flex;
                gap: 15px;
              }
              .card {
                /*cursor: pointer;*/
                color: white;
                padding: 15px 5px 5px 15px;
                width: 100px;
                height: 100px;
                background: #21374A;
                border-top: 2px #4B95D6 solid;
                border-left: 1px #4B95D6 solid;
                border-radius: 6px;
                box-shadow: rgba(0, 0, 0, 0.3) 0px 19px 38px, rgba(0, 0, 0, 0.22) 0px 15px 12px;
              }

              .card:hover {
                cursor: pointer;
                background: aliceblue;
                color: #21374A;
              }
              .card sl-icon {
                margin-bottom: 15px;
                font-size: 42px;
              }
              .card .subtext {
                color: #aca4a4;
                font-size: small;
              }
              #fab-publish {
                position: absolute;
                bottom: 30px;
                right: 30px;
              }
              #fab-publish::part(base) {
                font-weight: bold;
                font-size: 32px;
                box-shadow: rgba(0, 0, 0, 0.25) 0px 14px 28px, rgba(0, 0, 0, 0.22) 0px 10px 10px;
                /*--sl-input-height-medium: 48px;*/
              }
              #uploadingView {
                position: absolute;
                bottom: 0px;
                width: 250px;
                /*left: 40%;*/
                right:10px;
                margin-botton: 10px;
                padding: 5px;
                background: #ffffff;
                border-radius: 12px;
                box-shadow: rgba(0, 0, 0, 0.3) 0px 19px 38px, rgba(0, 0, 0, 0.22) 0px 15px 12px;
              }
              #searchResultView {
                position: absolute;
                top: 70px;
                left: 25%;
                padding: 15px;
                background: rgb(255, 255, 255);
                border-radius: 12px;
                box-shadow: rgba(0, 0, 0, 0.3) 0px 19px 38px, rgba(0, 0, 0, 0.22) 0px 15px 12px;
                display: flex;
                gap: 15px;
                max-width: 500px;
                flex-wrap: wrap;
              }
            `,];
    }
}
