import {ActionHash, AppAgentClient, decodeHashFromBase64} from "@holochain/client";
import {AttachmentName, AttachmentType, Hrl} from "@lightningrodlabs/we-applet";
import {asCellProxy, wrapPathInSvg} from "@ddd-qc/we-utils";
import {HrlWithContext, WeServices} from "@lightningrodlabs/we-applet";
import { mdiFileOutline } from "@mdi/js";
import {AppletHash} from "@lightningrodlabs/we-applet/dist/types";
import {FILES_DEFAULT_ROLE_NAME, FilesProxy} from "@files/elements";
import {ViewFileContext} from "../createFileShareApplet";


/** */
// export async function attachmentTypes(appletClient: AppAgentClient, appletId: EntryHash, weServices: WeServices): Promise<Record<string, AttachmentType>> {
  export const attachmentTypes = async function (appletClient: AppAgentClient, appletHash: AppletHash, weServices: WeServices): Promise<Record<AttachmentName, AttachmentType>> {
  const appInfo = await appletClient.appInfo();
  return {
    file: {
      label: "File",
      icon_src: wrapPathInSvg(mdiFileOutline),
      /** */
      async create(attachToHrl: Hrl): Promise<HrlWithContext> {
        console.log("Files/attachmentTypes::File", attachToHrl);
        const cellProxy = await asCellProxy(appletClient, undefined, appInfo.installed_app_id, FILES_DEFAULT_ROLE_NAME); // FIXME use appInfo.appId and roleName
        //const proxy: FilesProxy = new FilesProxy(cellProxy);
        //const entryInfo = await weServices.entryInfo(attachToHrl);

        return {
          hrl: [decodeHashFromBase64(cellProxy.cell.dnaHash), attachToHrl[1]], // FIXME
          context: {detail: "create"},
        } as HrlWithContext;
      }
    }
  };
}
