//import {attachmentTypes} from "./appletServices/attachmentTypes";
import {getEntryInfo} from "./appletServices/getEntryInfo";
import {createFileShareApplet} from "./createFileShareApplet";
import {weServicesMock} from "./mock";


/** */
const appletServices = {
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
};
