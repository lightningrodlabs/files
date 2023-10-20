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
import "@lightningrodlabs/we-applet/dist/elements/we-services-context.js";
import "@lightningrodlabs/we-applet/dist/elements/hrl-link.js";

import {ProfilesClient} from "@holochain-open-dev/profiles";
import {FileShareApp} from "@file-share/app";
import {asCellProxy} from "./we-utils";
import {FileShareProxy} from "@file-share/elements";
import {ProfilesApi} from "./profilesApi";
import {ExternalAppProxy} from "@ddd-qc/cell-proxy/";
import {destructureCloneId, HCL} from "@ddd-qc/lit-happ";


export interface ViewFileContext {
  detail: string,
}


/** */
export async function appletViews(
  client: AppAgentClient,
  thisAppletId: EntryHash,
  profilesClient: ProfilesClient,
  weServices: WeServices
) {

  const mainAppInfo = await client.appInfo();

  /** */
  const createFileShareApp = async (showFileOnly?: boolean) => {
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

  /** */
  return {
    main: async (hostElem) => {
      /** Link to styles */
      const cssLink = document.createElement('link');
      cssLink.href = "https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.4.0/dist/themes/light.css";
      cssLink.rel = "stylesheet";
      cssLink.media="(prefers-color-scheme:light)"
      /** Create and append <threads-app> */
      const app = await createFileShareApp();
      /** Append Elements to host */
      hostElem.appendChild(cssLink);
      hostElem.appendChild(app);
    },

    blocks: {},

    entries: {
      rFileShare: {
        file_share_integrity: {
          /** File */
          file: {
            /** */
            info: async (hrl: Hrl) => {
              console.log("(applet-view) pp info", hrl);
              const cellProxy = await asCellProxy(
                client,
                undefined, // hrl[0],
                mainAppInfo.installed_app_id,
              "rFileShare");
              console.log("(applet-view) cellProxy", cellProxy);
              const proxy: FileShareProxy = new FileShareProxy(cellProxy);
              console.log("(applet-view) getFile()", encodeHashToBase64(hrl[1]), proxy);
              const manifest = await proxy.getFileInfo(hrl[1]);
              console.log("(applet-view) file", manifest.description);
              return {
                icon_src: "",
                name: manifest.description.name,
              };
            },


            /** */
            view: async (hostElem, hrl: Hrl, context: ViewFileContext) => {
              console.log("(applet-view) file:", encodeHashToBase64(hrl[1]), context);

              const happElem = await createFileShareApp(true);

              /** TODO: Figure out why cell-context doesn't propagate normally via FileShareApp and has to be inserted again within the slot */
              const template = html`
                  <cell-context .cell=${happElem.fileShareDvm.cell}>
                      <file-view .hash=${encodeHashToBase64(hrl[1])}></file-view>
                  </cell-context>
              `;

              /** Append Elements */
              console.log("Appending <file-view> to FileShareApp...");
              render(template, happElem);
              console.log("DONE - Appending <file-view> to FileShareApp");

              hostElem.appendChild(happElem); //render(happElem, hostElem);
            },
          },
        }
      }
    },
  };
}
