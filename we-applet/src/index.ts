import {DevTestNames, setup} from "@ddd-qc/we-utils";
import {createFileShareApplet} from "./createFileShareApplet";
import {FILES_DEFAULT_ROLE_NAME, FileShareEntryType} from "@files/elements";
import {AppletServices} from "@lightningrodlabs/we-applet";
import {attachmentTypes} from "./appletServices/attachmentTypes";
import {getEntryInfo} from "./appletServices/getEntryInfo";
import {blockTypes} from "./appletServices/blockTypes";
import {DeliveryEntryType} from "@ddd-qc/delivery";
import {devtestNames, setupFilesBlockView, setupFilesEntryView} from "./devtest";
import {FilesBlockType} from "@files/app";




/** */
export async function setupFilesApplet() {
    /** Determine appletView */
    let APPLET_VIEW = "main";
    try {
        APPLET_VIEW = process.env.APPLET_VIEW;
        //console.log(`HAPP_ENV defined by process.ENV: "${happEnv}"`);
    } catch (e) {
    }
    console.log("Files we-applet setup() APPLET_VIEW", APPLET_VIEW);
    switch(APPLET_VIEW) {
        /** Entry views */
        case DeliveryEntryType.PrivateManifest:
        case DeliveryEntryType.PublicManifest: return setupFilesEntryView();
        /** Block views */
        case FilesBlockType.PickFile:
        case FilesBlockType.ImportFile: return setupFilesBlockView(APPLET_VIEW);
        /** Main View */
        case "main":
        default: return setupFilesMainView();
    }
}


/** */
async function setupFilesMainView() {
    const appletServices: AppletServices = {
        //attachmentTypes,
        attachmentTypes: async (_appletClient) => ({}),
        getEntryInfo,
        blockTypes,
        //blockTypes: {},
        search: async (appletClient, searchFilter) => {return []},
    };

    return setup(appletServices, createFileShareApplet, devtestNames);
}


export default setupFilesApplet;
