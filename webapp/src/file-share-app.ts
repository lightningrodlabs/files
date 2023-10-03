import { html, css } from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {ContextProvider} from "@lit-labs/context";
import {
  AdminWebsocket,
  AgentPubKeyB64,
  AppWebsocket,
  DnaDefinition, encodeHashToBase64, EntryHash,
  EntryHashB64,
  InstalledAppId,
  RoleName, ZomeName
} from "@holochain/client";
import {
  HvmDef, HappElement, HCL,
  ViewCellContext,
  CellDef, CellContext, delay, Cell,
  BaseRoleName,
  CloneId,
  AppProxy,
  DvmDef, DnaViewModel
} from "@ddd-qc/lit-happ";
import {
  DEFAULT_FILESHARE_DEF,
  DEFAULT_FILESHAREDEV_DEF,
  FileShareDvm,
  globalProfilesContext,
  ProfilesDvm
} from "@file-share/elements";
import {HC_ADMIN_PORT, HC_APP_PORT, CAN_ADD_PROFILES, IS_DEV} from "./globals";
import {WeServices, weServicesContext} from "@lightningrodlabs/we-applet";


/**
 *
 */
@customElement("file-share-app")
export class FileShareApp extends HappElement {

  @state() private _hasStartingProfile = false;
  @state() private _offlinePerspectiveloaded = false;

  /** HvmDef */
  static readonly HVM_DEF: HvmDef = CAN_ADD_PROFILES? DEFAULT_FILESHAREDEV_DEF : DEFAULT_FILESHARE_DEF;


  /** All arguments should be provided when constructed explicity */
  constructor(appWs?: AppWebsocket, private _adminWs?: AdminWebsocket, private _canAuthorizeZfns?: boolean, readonly appId?: InstalledAppId, public showCommentThreadOnly?: boolean) {
    super(appWs? appWs : HC_APP_PORT, appId);
    console.log("FileShareApp.HVM_DEF", FileShareApp.HVM_DEF);
    if (_canAuthorizeZfns == undefined) {
      this._canAuthorizeZfns = true;
    }
    //const worker = new WebWorker();
    //worker.postMessage({type: 'init', args: 'This instance was created in a worker'});
  }


  /** -- We-applet specifics -- */

  private _profilesDvm?: ProfilesDvm;
  protected _profilesProvider?: unknown; // FIXME type: ContextProvider<this.getContext()> ?
  protected _weProvider?: unknown; // FIXME type: ContextProvider<this.getContext()> ?
  public appletId?: EntryHashB64;


  /**  */
  static async fromWe(
      appWs: AppWebsocket,
      adminWs: AdminWebsocket,
      canAuthorizeZfns: boolean,
      appId: InstalledAppId,
      profilesAppId: InstalledAppId,
      profilesBaseRoleName: BaseRoleName,
      profilesCloneId: CloneId | undefined,
      profilesZomeName: ZomeName,
      profilesProxy: AppProxy,
      weServices: WeServices,
      thisAppletId: EntryHash,
      showCommentThreadOnly?: boolean,
  ) : Promise<FileShareApp> {
    const app = new FileShareApp(appWs, adminWs, canAuthorizeZfns, appId, showCommentThreadOnly);
    /** Provide it as context */
    console.log(`\t\tProviding context "${weServicesContext}" | in host `, app);
    app._weProvider = new ContextProvider(app, weServicesContext, weServices);
    app.appletId = encodeHashToBase64(thisAppletId);
    /** Create Profiles Dvm from provided AppProxy */
    console.log("<thread-app>.ctor()", profilesProxy);
    await app.createProfilesDvm(profilesProxy, profilesAppId, profilesBaseRoleName, profilesCloneId, profilesZomeName);
    return app;
  }

  /** Create a Profiles DVM out of a different happ */
  async createProfilesDvm(profilesProxy: AppProxy, profilesAppId: InstalledAppId, profilesBaseRoleName: BaseRoleName,
                          profilesCloneId: CloneId | undefined,
                          _profilesZomeName: ZomeName): Promise<void> {
    const profilesAppInfo = await profilesProxy.appInfo({installed_app_id: profilesAppId});
    const profilesDef: DvmDef = {ctor: ProfilesDvm, baseRoleName: profilesBaseRoleName, isClonable: false};
    const cell_infos = Object.values(profilesAppInfo.cell_info);
    console.log("createProfilesDvm() cell_infos:", cell_infos);
    /** Create Profiles DVM */
        //const profilesZvmDef: ZvmDef = [ProfilesZvm, profilesZomeName];
    const dvm: DnaViewModel = new profilesDef.ctor(this, profilesProxy, new HCL(profilesAppId, profilesBaseRoleName, profilesCloneId));
    console.log("createProfilesDvm() dvm", dvm);
    await this.setupProfilesDvm(dvm as ProfilesDvm, encodeHashToBase64(profilesAppInfo.agent_pub_key));
  }

  /** */
  async setupProfilesDvm(dvm: ProfilesDvm, agent: AgentPubKeyB64): Promise<void> {
    this._profilesDvm = dvm as ProfilesDvm;
    /** Load My profile */
    const maybeMyProfile = await this._profilesDvm.profilesZvm.probeProfile(agent);
    if (maybeMyProfile) {
      const maybeLang = maybeMyProfile.fields['lang'];
      if (maybeLang) {
        //setLocale(maybeLang);
      }
      this._hasStartingProfile = true;
    }
    /** Provide it as context */
    console.log(`\t\tProviding context "${globalProfilesContext}" | in host `, this);
    this._profilesProvider = new ContextProvider(this, globalProfilesContext, this._profilesDvm.profilesZvm);
  }


  /** QoL */
  get fileShareDvm(): FileShareDvm { return this.hvm.getDvm(FileShareDvm.DEFAULT_BASE_ROLE_NAME)! as FileShareDvm }

  /** -- Fields -- */

  @state() private _loaded = false;

  /** ZomeName -> (AppEntryDefName, isPublic) */
  private _allAppEntryTypes: Record<string, [string, boolean][]> = {};


  @state() private _cell?: Cell;


  private _dnaDef?: DnaDefinition;

  /** */
  async hvmConstructed() {
    console.log("hvmConstructed()", this._adminWs, this._canAuthorizeZfns)
    /** Authorize all zome calls */
    if (!this._adminWs && this._canAuthorizeZfns) {
      this._adminWs = await AdminWebsocket.connect(new URL(`ws://localhost:${HC_ADMIN_PORT}`));
      console.log("hvmConstructed() connect() called", this._adminWs);
    }
    if (this._adminWs && this._canAuthorizeZfns) {
      await this.hvm.authorizeAllZomeCalls(this._adminWs);
      console.log("*** Zome call authorization complete");
    } else {
      if (!this._canAuthorizeZfns) {
        console.warn("No adminWebsocket provided (Zome call authorization done)")
      } else {
        console.log("Zome call authorization done externally")
      }
    }
    /** Probe */
    this._cell = this.fileShareDvm.cell; // ???
    this._allAppEntryTypes = await this.fileShareDvm.fetchAllEntryDefs();
    console.log("happInitialized(), _allAppEntryTypes", this._allAppEntryTypes);

    if (CAN_ADD_PROFILES) {
      await this.setupProfilesDvm(this.hvm.getDvm("profiles") as ProfilesDvm, this._cell.agentPubKey);
    }

    /** Done */
    this._loaded = true;
  }


  /** */
  async perspectiveInitializedOffline(): Promise<void> {
    console.log("<fileshare-app>.perspectiveInitializedOffline()");
    /** Done */
    this._offlinePerspectiveloaded = true;
  }


  /** */
  async perspectiveInitializedOnline(): Promise<void> {
    console.log("<fileshare-app>.perspectiveInitializedOnline()");

    await this.hvm.probeAll();

    /** Done */
    //this._loaded = true;
  }



  /** */
  async refresh(_e?: any) {
    console.log("file-share-app.refresh() called")
    await this.hvm.probeAll();
  }


  /** */
  render() {
    console.log("*** <fileshare-app> render()", this._loaded)
    if (!this._loaded) {
      return html`<span>Loading...</span>`;
    }
    //console.log({coordinator_zomes: this._dnaDef?.coordinator_zomes})
    const zomeNames = this._dnaDef?.coordinator_zomes.map((zome) => { return zome[0]; });
    console.log({zomeNames})

    /* render all */
    return html`
      <cell-context .cell="${this._cell}">
        <!-- <view-cell-context></view-cell-context> -->
        <file-share-page style="flex: 1;height:100vh;" devmode=${IS_DEV}></file-share-page>
      </cell-context>        
    `
  }

}
