
import {asCellProxy, wrapPathInSvg} from "@ddd-qc/we-utils";
import {AppAgentClient, encodeHashToBase64, RoleName, ZomeName} from "@holochain/client";
import {FILES_DEFAULT_ROLE_NAME, FilesProxy} from "@ddd-qc/files";
import {pascal} from "@ddd-qc/cell-proxy";
import {DELIVERY_INTERGRITY_ZOME_NAME, DeliveryEntryType} from "@ddd-qc/delivery";
import {mdiFileOutline} from "@mdi/js";
import {AttachableInfo, Hrl, HrlWithContext} from "@lightningrodlabs/we-applet/dist/types";


/** */
export async function getAttachableInfo(
    appletClient: AppAgentClient,
    roleName: RoleName,
    integrityZomeName: ZomeName,
    entryType: string,
    hrlc: HrlWithContext,
): Promise<AttachableInfo | undefined> {
    console.log("Files/we-applet/getAttachableInfo():", roleName, integrityZomeName, hrlc);
    if (roleName != FILES_DEFAULT_ROLE_NAME) {
        throw new Error(`Files/we-applet/getAttachableInfo(): Unknown role name '${roleName}'.`);
    }
    if (integrityZomeName != DELIVERY_INTERGRITY_ZOME_NAME) {
        throw new Error(`Files/we-applet/getAttachableInfo(): Unknown zome '${integrityZomeName}'.`);
    }

    const mainAppInfo = await appletClient.appInfo();
    const pEntryType = pascal(entryType);

    console.log("Files/we-applet/getAttachableInfo(): pEntryType", pEntryType);
    switch (pEntryType) {
        case DeliveryEntryType.PrivateManifest:
        case DeliveryEntryType.PublicManifest:
            console.log("Files/we-applet/getAttachableInfo(): pp info", hrlc);
            const cellProxy = await asCellProxy(
                appletClient,
                undefined, // hrl[0],
                mainAppInfo.installed_app_id,
                FILES_DEFAULT_ROLE_NAME);
            console.log("Files/we-applet/getAttachableInfo(): cellProxy", cellProxy);
            const proxy/*: FilesProxy */ = new FilesProxy(cellProxy);
            console.log("Files/we-applet/getAttachableInfo(): getFile()", encodeHashToBase64(hrlc[1]), proxy);
            const manifest = await proxy.getFileInfo(hrlc[1]);
            console.log("Files/we-applet/getAttachableInfo(): file", manifest.description);
            return {
                icon_src: wrapPathInSvg(mdiFileOutline),
                name: manifest.description.name,
            };
        break;
        default:
            throw new Error(`Files/we-applet/getAttachableInfo(): Unknown entry type ${entryType}.`);
    }
}




