//import {attachmentTypes} from "./appletServices/attachmentTypes";
import {getEntryInfo} from "./appletServices/getEntryInfo";
import {createFileShareApplet} from "./createFileShareApplet";
import {weServicesMock} from "./mock";
import {AppletServices} from "@lightningrodlabs/we-applet";
import {setupDemo} from "./setupDemo";
import {setup} from "./setup";

/** */
const appletServices: AppletServices = {
    //attachmentTypes,
    attachmentTypes: async (_appletClient) => ({}),
    getEntryInfo,
    blockTypes: {},
    search: async (appletClient, searchFilter) => {return []},
};

export default {
    createFileShareApplet,
    weServicesMock,
    appletServices,
    setupDemo,
    setup,
};
