
import {asCellProxy, wrapPathInSvg} from "@ddd-qc/we-utils";
import {AppAgentClient, encodeHashToBase64, RoleName, ZomeName} from "@holochain/client";
import {FILES_DEFAULT_ROLE_NAME, FilesProxy} from "@ddd-qc/files";
import {pascal} from "@ddd-qc/cell-proxy";
import {DELIVERY_INTERGRITY_ZOME_NAME, DeliveryEntryType} from "@ddd-qc/delivery";
import {mdiFileOutline} from "@mdi/js";
import {AssetInfo, WAL} from "@lightningrodlabs/we-applet/dist/types";


/** */
export async function getAssetInfo(
    appletClient: AppAgentClient,
    roleName: RoleName,
    integrityZomeName: ZomeName,
    entryType: string,
    hrlc: WAL,
): Promise<AssetInfo | undefined> {
    console.log("Files/we-applet/getAssetInfo():", roleName, integrityZomeName, hrlc);
    if (roleName != FILES_DEFAULT_ROLE_NAME) {
        throw new Error(`Files/we-applet/getAssetInfo(): Unknown role name '${roleName}'.`);
    }
    if (integrityZomeName != DELIVERY_INTERGRITY_ZOME_NAME) {
        throw new Error(`Files/we-applet/getAssetInfo(): Unknown zome '${integrityZomeName}'.`);
    }

    const mainAppInfo = await appletClient.appInfo();
    const pEntryType = pascal(entryType);

    console.log("Files/we-applet/getAssetInfo(): pEntryType", pEntryType);
    switch (pEntryType) {
        case DeliveryEntryType.PrivateManifest:
        case DeliveryEntryType.PublicManifest:
            console.log("Files/we-applet/getAssetInfo(): pp info", hrlc);
            const cellProxy = await asCellProxy(
                appletClient,
                undefined, // hrl[0],
                mainAppInfo.installed_app_id,
                FILES_DEFAULT_ROLE_NAME);
            console.log("Files/we-applet/getAssetInfo(): cellProxy?", !!cellProxy);
            const proxy/*: FilesProxy */ = new FilesProxy(cellProxy);
            console.log("Files/we-applet/getAssetInfo(): getFile()", encodeHashToBase64(hrlc.hrl[1]), proxy);
            const manifest = await proxy.getFileInfo(hrlc.hrl[1]);
            console.log("Files/we-applet/getAssetInfo(): file", manifest.description);
            return {
                icon_src: wrapPathInSvg(mdiFileOutline),
                name: manifest.description.name,
            };
        break;
        default:
            throw new Error(`Files/we-applet/getAssetInfo(): Unknown entry type ${entryType}.`);
    }
}




