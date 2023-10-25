import {getEntryInfo} from "./getEntryInfo";
import {AppletServices} from "@lightningrodlabs/we-applet";
import {DevTestNames} from "../setup";

/** */
export const fileShareNames: DevTestNames = {
    installed_app_id: "file_share-applet",
    provisionedRoleName: "rFileShare",
}


/** */
export const appletServices: AppletServices = {
    //attachmentTypes,
    attachmentTypes: async (_appletClient) => ({}),
    getEntryInfo,
    blockTypes: {},
    search: async (appletClient, searchFilter) => {return []},
};
