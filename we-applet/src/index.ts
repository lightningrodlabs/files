import {DevTestNames, setup} from "@ddd-qc/we-utils";
import {appletServices} from "./appletServices/appletServices";
import {createFileShareApplet} from "./createFileShareApplet";


/** */
async function setupFilesApplet() {
    const fileShareNames: DevTestNames = {
        installed_app_id: "file_share-applet",
        provisionedRoleName: "rFileShare",
    }
    return setup(appletServices, createFileShareApplet, fileShareNames);
}

export default setupFilesApplet;
