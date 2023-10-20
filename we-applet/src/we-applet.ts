import {
  AppAgentClient,
  AppAgentWebsocket,
  encodeHashToBase64,
  EntryHash
} from "@holochain/client";
import {html, render} from "lit";
//import { msg } from "@lit/localize";

import {
  Hrl,
  WeServices,
} from "@lightningrodlabs/we-applet";

import "@holochain-open-dev/profiles/dist/elements/profiles-context.js";
import "@lightningrodlabs/we-applet/dist/elements/we-client-context.js";
import "@lightningrodlabs/we-applet/dist/elements/hrl-link.js";


import {ProfilesClient} from "@holochain-open-dev/profiles";
import {FileShareApp} from "@file-share/app";
import {asCellProxy} from "./we-utils";
import {FileShareProxy} from "@file-share/elements";
import {ProfilesApi} from "./profilesApi";
import {ExternalAppProxy} from "@ddd-qc/cell-proxy/";
import {destructureCloneId, HCL} from "@ddd-qc/lit-happ";



// export interface ViewFileContext {
//   detail: string,
// }


/** */
export async function createFileShareApplet(
  client: AppAgentClient,
  thisAppletId: EntryHash,
  profilesClient: ProfilesClient,
  weServices: WeServices
): Promise<FileShareApp> {

  const mainAppInfo = await client.appInfo();

  const showFileOnly = false; // FIXME

  /** Determine profilesAppInfo */
  console.log("FileShareApplet.main()", client);
  const mainAppAgentWs = client as AppAgentWebsocket;
  const mainAppWs = mainAppAgentWs.appWebsocket;
  // const mainAppWs = client as unknown as AppWebsocket;
  // const mainAppInfo = await mainAppWs.appInfo({installed_app_id: 'threads-applet'});
  console.log("mainAppInfo", mainAppInfo);
  //const profilesAppAgentClient: AppAgentClient = profilesClient.client;
  let profilesAppInfo = await profilesClient.client.appInfo();
  console.log("profilesAppInfo", profilesAppInfo, profilesClient.roleName);
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
  console.log("profilesCellProxy", profilesCellProxy);
  /** Create FileShareApp */
  const app = await FileShareApp.fromWe(
    mainAppWs, undefined, false, mainAppInfo.installed_app_id,
    profilesAppInfo.installed_app_id, baseRoleName, maybeCloneId, profilesClient.zomeName, profilesAppProxy,
    weServices, thisAppletId, showFileOnly);
  /** Done */
  return app;

}
