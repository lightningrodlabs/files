
import {asCellProxy, wrapPathInSvg} from "@ddd-qc/we-utils";
import {encodeHashToBase64} from "@holochain/client";
import {FILES_DEFAULT_ROLE_NAME, FilesProxy} from "@ddd-qc/files";
import {pascal} from "@ddd-qc/cell-proxy";
import {DELIVERY_INTERGRITY_ZOME_NAME, DeliveryEntryType} from "@ddd-qc/delivery";
import {mdiFileOutline} from "@mdi/js";


/** */
export async function getEntryInfo(
    appletClient,
    roleName,
    integrityZomeName,
    entryType,
    hrl
) {
    console.log("Files/we-applet/getEntryInfo():", roleName, integrityZomeName, hrl);
    if (roleName != FILES_DEFAULT_ROLE_NAME) {
        throw new Error(`Files/we-applet/getEntryInfo(): Unknown role name '${roleName}'.`);
    }
    if (integrityZomeName != DELIVERY_INTERGRITY_ZOME_NAME) {
        throw new Error(`Files/we-applet/getEntryInfo(): Unknown zome '${integrityZomeName}'.`);
    }

    const mainAppInfo = await appletClient.appInfo();
    const pEntryType = pascal(entryType);

    console.log("Files/we-applet/getEntryInfo(): pEntryType", pEntryType);
    switch (pEntryType) {
        case DeliveryEntryType.PrivateManifest:
        case DeliveryEntryType.PublicManifest:
            console.log("Files/we-applet/getEntryInfo(): pp info", hrl);
            const cellProxy = await asCellProxy(
                appletClient,
                undefined, // hrl[0],
                mainAppInfo.installed_app_id,
                FILES_DEFAULT_ROLE_NAME);
            console.log("Files/we-applet/getEntryInfo(): cellProxy", cellProxy);
            const proxy/*: FilesProxy */ = new FilesProxy(cellProxy);
            console.log("Files/we-applet/getEntryInfo(): getFile()", encodeHashToBase64(hrl[1]), proxy);
            const manifest = await proxy.getFileInfo(hrl[1]);
            console.log("Files/we-applet/getEntryInfo(): file", manifest.description);
            return {
                icon_src: wrapPathInSvg(mdiFileOutline),
                name: manifest.description.name,
            };
        break;
        default:
            throw new Error(`Files/we-applet/getEntryInfo(): Unknown entry type ${entryType}.`);
    }
}




