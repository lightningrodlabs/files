import {ActionHash, AppAgentClient, decodeHashFromBase64, encodeHashToBase64, EntryHash} from "@holochain/client";
import {AttachmentName, AttachmentType, Hrl} from "@lightningrodlabs/we-applet";
import {asCellProxy, wrapPathInSvg} from "../we-utils";
import {FileShareProxy} from "@file-share/elements";
import {HrlWithContext, WeServices} from "@lightningrodlabs/we-applet";
import { mdiFileOutline } from "@mdi/js";
import {AppletHash} from "@lightningrodlabs/we-applet/dist/types";


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
        console.log("attachmentTypes::File", attachToHrl);
        const cellProxy = await asCellProxy(appletClient, undefined, appInfo.installed_app_id, "rFileShare"); // FIXME use appInfo.appId and roleName

        //const entryInfo = await weServices.entryInfo(attachToHrl);
        //const proxy: FileShareProxy = new FileShareProxy(cellProxy);
        // const input: CreatePpInput = {
        //   pp: {
        //   purpose: "comment",
        //   rules: "FFA", //FIXME: 'We' should provide a way for a user to provide extra info
        //   subjectHash: attachToHrl[1],
        //   subjectType: "unknown type", //FIXME: 'We' should provide entryInfo.type
        // },
        //   appletId: entryInfo.appletId,
        //   dnaHash: attachToHrl[0],
        // };
        //
        // let ppAh: ActionHash = undefined;
        // let context: ViewFileContext;
        //
        // /** Check if PP already exists */
        // console.log("attachmentTypes.file() calling getPpsFromSubjectHash():", encodeHashToBase64(attachToHrl[1]));
        // const maybeThreads = await proxy.getPpsFromSubjectHash(attachToHrl[1]);
        // console.log("attachmentTypes.file() maybeThreads", maybeThreads);
        // for (const ppPair of maybeThreads) {
        //   const res = await proxy.getPp(ppPair[0]);
        //   console.log("attachmentTypes.file() res", res);
        //   const pp = res[0];
        //   if (pp.purpose == "comment") {
        //     ppAh = ppPair[0];
        //     context = {detail: "existing"};
        //     break;
        //   }
        // }
        //
        // /** Create PP */
        // if (!ppAh) {
        //   console.log("attachmentTypes.file() calling createParticipationProtocol()", input);
        //   const res = await proxy.createParticipationProtocol(input);
        //   console.log("attachmentTypes.file() res", res);
        //   ppAh = res[0];
        //   console.log("attachmentTypes.file() ppAh", encodeHashToBase64(ppAh));
        //   context = {detail: "create"};
        // }
        //
        // /** Done */
        // console.log("attachmentTypes.file() DONE", context);

        return {
          hrl: [decodeHashFromBase64(cellProxy.cell.dnaHash), attachToHrl[1]], // FIXME
          context: {detail: "create"},
        } as HrlWithContext;
      }
    }
  };
}
