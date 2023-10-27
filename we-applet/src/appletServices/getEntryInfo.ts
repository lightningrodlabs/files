
import {asCellProxy} from "@ddd-qc/we-utils";
import {encodeHashToBase64} from "@holochain/client";
import {FileShareProxy} from "@file-share/elements";


/** */
export async function getEntryInfo(
    appletClient,
    roleName,
    integrityZomeName,
    entryType,
    hrl
) {
    if (roleName != "rFileShare") {
        throw new Error(`Files/we-applet: Unknown role name '${roleName}'.`);
    }
    if (integrityZomeName != "file_share_integrity") {
        throw new Error(`Files/we-applet: Unknown zome '${integrityZomeName}'.`);
    }

    const mainAppInfo = await appletClient.appInfo();

    switch (entryType) {
        case "file": {
            console.log("Files/we-applet/applet-view pp info", hrl);
            const cellProxy = await asCellProxy(
                appletClient,
                undefined, // hrl[0],
                mainAppInfo.installed_app_id,
                "rFileShare");
            console.log("Files/we-applet/applet-view cellProxy", cellProxy);
            const proxy/*: FileShareProxy*/ = new FileShareProxy(cellProxy);
            console.log("Files/we-applet/applet-view getFile()", encodeHashToBase64(hrl[1]), proxy);
            const manifest = await proxy.getFileInfo(hrl[1]);
            console.log("Files/we-applet/applet-view file", manifest.description);
            return {
                icon_src: "",
                name: manifest.description.name,
            };
        }
        default:
            throw new Error(`Files/we-applet: Unknown entry type ${entryType}.`);
    }
}




