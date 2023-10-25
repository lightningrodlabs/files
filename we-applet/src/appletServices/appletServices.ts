import {getEntryInfo} from "./getEntryInfo";
import {AppletServices} from "@lightningrodlabs/we-applet";

/** */
export const appletServices: AppletServices = {
    //attachmentTypes,
    attachmentTypes: async (_appletClient) => ({}),
    getEntryInfo,
    blockTypes: {},
    search: async (appletClient, searchFilter) => {return []},
};
