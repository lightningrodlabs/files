import {
  AppAgentClient,
  AppAgentWebsocket,
  EntryHash
} from "@holochain/client";
//import { msg } from "@lit/localize";

import {
  WeServices,
} from "@lightningrodlabs/we-applet";

import "@holochain-open-dev/profiles/dist/elements/profiles-context.js";
import "@lightningrodlabs/we-applet/dist/elements/we-client-context.js";
import "@lightningrodlabs/we-applet/dist/elements/hrl-link.js";


import {ProfilesClient} from "@holochain-open-dev/profiles";
import {FileShareApp} from "@file-share/app";
import {ProfilesApi} from "./profilesApi";
import {ExternalAppProxy} from "@ddd-qc/cell-proxy/";
import {destructureCloneId, HCL} from "@ddd-qc/lit-happ";



// export interface ViewFileContext {
//   detail: string,
// }


/** */
export async function createFileShareApplet(
  client: AppAgentClient,
  thisAppletHash: EntryHash,
  profilesClient: ProfilesClient,
  weServices: WeServices
): Promise<FileShareApp> {

  console.log("createFileShareApplet() client", client);
  console.log("createFileShareApplet() thisAppletId", thisAppletHash);

  const mainAppInfo = await client.appInfo();

  console.log("createFileShareApplet() mainAppInfo", mainAppInfo);

  const showFileOnly = false; // FIXME

  /** Determine profilesAppInfo */
  const mainAppAgentWs = client as AppAgentWebsocket;
  const mainAppWs = mainAppAgentWs.appWebsocket;
  let profilesAppInfo = await profilesClient.client.appInfo();
  console.log("createFileShareApplet() profilesAppInfo", profilesAppInfo, profilesClient.roleName);
  /** Check if roleName is actually a cloneId */
  let maybeCloneId = undefined;
  let baseRoleName = profilesClient.roleName;
  const maybeBaseRoleName = destructureCloneId(profilesClient.roleName);
  if (maybeBaseRoleName) {
    baseRoleName = maybeBaseRoleName[0];
    maybeCloneId = profilesClient.roleName;
  }
  /** Determine profilesCellProxy */
  const hcl = new HCL(profilesAppInfo.installed_app_id, baseRoleName, maybeCloneId);
  const profilesApi = new ProfilesApi(profilesClient);
  const profilesAppProxy = new ExternalAppProxy(profilesApi, 10 * 1000);
  await profilesAppProxy.fetchCells(profilesAppInfo.installed_app_id, baseRoleName);
  const profilesCellProxy = await profilesAppProxy.createCellProxy(hcl);
  console.log("createFileShareApplet() profilesCellProxy", profilesCellProxy);
  /** Create FileShareApp */
  const app = await FileShareApp.fromWe(
    mainAppWs, undefined, false, mainAppInfo.installed_app_id,
    profilesAppInfo.installed_app_id, baseRoleName, maybeCloneId, profilesClient.zomeName, profilesAppProxy,
    weServices, thisAppletHash, showFileOnly);
  console.log("createFileShareApplet() app", app);
  /** Done */
  return app;

}
