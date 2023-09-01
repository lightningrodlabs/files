import {css, html, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
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
import {emptyAppletId, getInitials} from "../utils";

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
    @property() appletId: EntryHashB64;


    @consume({ context: globalProfilesContext, subscribe: true })
    _profilesZvm!: ProfilesZvm;

    @consume({ context: weServicesContext, subscribe: true })
    weServices!: WeServices;

    private _myProfile: FileShareProfile = {nickname: "unknown", fields: {}}


    /** AppletId -> AppletInfo */
    @state() private _appletInfos: Dictionary<AppletInfo> = {}


    /** After first render only */
    async firstUpdated() {
        // this._initialized = true;
        console.log("<semantic-threads-page> firstUpdated() _appletInfos", this.appletId);

        /** Generate test data */
        if (!this.appletId) {
            this.appletId = encodeHashToBase64(await emptyAppletId());
            console.warn("no appletId provided. A fake one has been generated", this.appletId);
        }
        //await this._dvm.threadsZvm.generateTestData(this.appletId);

        /** */
        const leftSide = this.shadowRoot.getElementById("leftSide");
        leftSide.style.background = "#B9CCE7";

        this.requestUpdate();
    }


    /** */
    async onAddFile(e: any) {
        const fileInput = this.shadowRoot!.getElementById("addFile") as HTMLInputElement;
        console.log("onAddFile():", fileInput.files.length);
        if (fileInput.files.length > 0) {
            let res = await this._dvm.fileShareZvm.commitFile(fileInput.files[0]);
            console.log("onAddFile() res:", res);
            //fileInput.files = [];
        }
    }


    /** */
    async onSendFile(e: any) {
        const localFileInput = this.shadowRoot!.getElementById("localFileInput") as HTMLSelectElement;
        const agentSelect = this.shadowRoot!.getElementById("recipientSelector") as HTMLSelectElement;
        console.log("onSendFile():", localFileInput.value, agentSelect.value);
        let res = await this._dvm.fileShareZvm.sendFile(localFileInput.value, agentSelect.value);
        console.log("onSendFile() res:", res);
        //localFileInput.value = "";
    }


    /** */
    render() {
        console.log("<semantic-threads-page>.render()", this._initialized, this._profilesZvm);

        if (!this._profilesZvm) {
            console.error("this._profilesZvm not found");
        } else {
            this._myProfile = this._profilesZvm.getMyProfile();
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


        const AgentOptions = Object.entries(this._profilesZvm.perspective.profiles).map(
            ([agentIdB64, profile]) => {
                //console.log("" + index + ". " + agentIdB64)
                return html `<option value="${agentIdB64}">${profile.nickname}</option>`
            }
        )

        const fileOptions = Object.entries(this._dvm.fileShareZvm.perspective.localFiles).map(
            ([eh, manifest]) => {
                //console.log("" + index + ". " + agentIdB64)
                return html `<option value="${eh}">${manifest.name}</option>`
            }
        )

        const fileList = Object.entries(this._dvm.fileShareZvm.perspective.localFiles).map(
            ([eh, manifest]) => {
                //console.log("" + index + ". " + agentIdB64)
                return html `<ui value="${eh}">${manifest.name}</ui>`
            }
        )

        /** Render all */
        return html`
      <div>
        <h1>FileShare Central<button type="button" @click=${() => {this._dvm.dumpLogs();}}>dump</button></h1>
        <label>Send File:</label>
        <input type="text" id="localFileInput" name="content">
          File: <select id="localFileSelector">
          ${fileOptions}
      </select>
          to: <select id="recipientSelector">
            ${AgentOptions}
          </select>
        <input type="button" value="send" @click=${this.onSendFile}>
          <hr/>
          <label for="addFile">Add file to source-chain:</label>
          <input type="file" id="addFile" name="addFile" />
          <input type="button" value="Add" @click=${this.onAddFile}>
          <hr/>
          <h2>Local files</h2>
          <ul>
              ${fileList}
          </ul>
      </div>
    `;
    }

}
