import {DevTestNames, setup} from "@ddd-qc/we-utils";
import {createFileShareApplet} from "./createFileShareApplet";
import {FILES_DEFAULT_ROLE_NAME} from "@files/elements";
import {AppletServices} from "@lightningrodlabs/we-applet";
import {attachmentTypes} from "./appletServices/attachmentTypes";
import {getEntryInfo} from "./appletServices/getEntryInfo";
import {blockTypes} from "./appletServices/blockTypes";


/** */
async function setupFilesApplet() {

    const filesNames: DevTestNames = {
        installed_app_id: "files-we_applet",
        provisionedRoleName: FILES_DEFAULT_ROLE_NAME,
    }

    const appletServices: AppletServices = {
        //attachmentTypes,
        attachmentTypes: async (_appletClient) => ({}),
        getEntryInfo,
        blockTypes,
        //blockTypes: {},
        search: async (appletClient, searchFilter) => {return []},
    };

    return setup(appletServices, createFileShareApplet, filesNames);
}


export default setupFilesApplet;
