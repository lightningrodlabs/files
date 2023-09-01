import { html } from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {
  HvmDef,
  HappElement,
  HCL,
  ViewCellContext,
  CellDef,
  CellContext,
  delay,
  Cell,
  BaseRoleName,
  CloneId,
  AppProxy,
  DvmDef,
  DnaViewModel
} from "@ddd-qc/lit-happ";
import {
  AdminWebsocket,
  AgentPubKeyB64,
  AppWebsocket,
  DnaDefinition, encodeHashToBase64, EntryHash,
  EntryHashB64,
  InstalledAppId,
  RoleName, ZomeName
} from "@holochain/client";
import {FileShareDvm, globalProfilesContext, ProfilesDvm} from "@file-share/elements";
import {HC_APP_PORT} from "./globals";
import {WeServices, weServicesContext} from "@lightningrodlabs/we-applet";
import {ContextProvider} from "@lit-labs/context";


/**
 *
 */
@customElement("file-share-app")
export class FileShareApp extends HappElement {

  @state() private _hasStartingProfile = false;

  /** HvmDef */
  static readonly HVM_DEF: HvmDef = {
    id: "hFileShare",
    dvmDefs: [{ctor: FileShareDvm, isClonable: true}],
  };


  /** All arguments should be provided when constructed explicity */
  constructor(appWs?: AppWebsocket, private _adminWs?: AdminWebsocket, private _canAuthorizeZfns?: boolean, readonly appId?: InstalledAppId, public showCommentThreadOnly?: boolean) {
    super(appWs? appWs : HC_APP_PORT, appId);
    if (_canAuthorizeZfns == undefined) {
      this._canAuthorizeZfns = true;
    }
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
                          profilesZomeName: ZomeName): Promise<void> {
    const profilesAppInfo = await profilesProxy.appInfo({installed_app_id: profilesAppId});
    const profilesDef: DvmDef = {ctor: ProfilesDvm, baseRoleName: profilesBaseRoleName, isClonable: false};
    const cell_infos = Object.values(profilesAppInfo.cell_info);
    console.log("createProfilesDvm() cell_infos:", cell_infos);
    /** Create Profiles DVM */
        //const profilesZvmDef: ZvmDef = [ProfilesZvm, profilesZomeName];
    const dvm: DnaViewModel = new profilesDef.ctor(this, profilesProxy, new HCL(profilesAppId, profilesBaseRoleName, profilesCloneId));
    console.log("createProfilesDvm() dvm", dvm);
    this._profilesDvm = dvm as ProfilesDvm;
    /** Load My profile */
    const maybeMyProfile = await this._profilesDvm.profilesZvm.probeProfile(encodeHashToBase64(profilesAppInfo.agent_pub_key));
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
  get fileShare(): FileShareDvm { return this.hvm.getDvm(FileShareDvm.DEFAULT_BASE_ROLE_NAME)! as FileShareDvm }

  /** -- Fields -- */

  @state() private _loaded = false;

  /** ZomeName -> (AppEntryDefName, isPublic) */
  private _allAppEntryTypes: Record<string, [string, boolean][]> = {};


  @state() private _cell?: Cell;


  private _dnaDef?: DnaDefinition;

  /** */
  async hvmConstructed() {
    console.log("hvmConstructed()")
    //new ContextProvider(this, cellContext, this.taskerDvm.cell);
    /** Authorize all zome calls */
    const adminWs = await AdminWebsocket.connect(`ws://localhost:${process.env.ADMIN_PORT}`);
    console.log({adminWs});
    await this.hvm.authorizeAllZomeCalls(adminWs);
    console.log("*** Zome call authorization complete");
    this._dnaDef = await adminWs.getDnaDefinition(this.fileShare.cell.id[0]);
    console.log("happInitialized() dnaDef", this._dnaDef);
    /** Probe */
    this._cell = this.fileShare.cell;
    await this.hvm.probeAll();
    this._allAppEntryTypes = await this.fileShare.fetchAllEntryDefs();
    console.log("happInitialized(), _allAppEntryTypes", this._allAppEntryTypes);
    // TODO: Fix issue: zTasker entry_defs() not found. Maybe confusion with integrity zome name?
    /** Done */
    this._loaded = true;
  }


  /** */
  async refresh(_e?: any) {
    console.log("file-share-app.refresh() called")
    await this.hvm.probeAll();
  }


  /** */
  render() {
    console.log("*** <secret-app> render()", this._loaded)
    if (!this._loaded) {
      return html`<span>Loading...</span>`;
    }
    //console.log({coordinator_zomes: this._dnaDef?.coordinator_zomes})
    const zomeNames = this._dnaDef?.coordinator_zomes.map((zome) => { return zome[0]; });
    console.log({zomeNames})

    /* render all */
    return html`
      <cell-context .cell="${this._cell}">
        <view-cell-context></view-cell-context>
        <file-share-page style="flex: 1;"></file-share-page>
      </cell-context>        
    `
  }

}
