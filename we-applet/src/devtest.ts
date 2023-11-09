import {createDefaultWeServicesMock, DevTestNames, EntryViewInfo, setupDevtest} from "@ddd-qc/we-utils";
import {FILES_DEFAULT_ROLE_NAME} from "@ddd-qc/files";
import {ActionHash, EntryHash, fakeActionHash} from "@holochain/client";
import {emptyEntryAppletView} from "@ddd-qc/we-utils/dist/mocks/renderInfoMock";
import {snake} from "@ddd-qc/cell-proxy";
import {createFileShareApplet, ViewFileContext} from "./createFileShareApplet";
import {DELIVERY_INTERGRITY_ZOME_NAME, DeliveryEntryType} from "@ddd-qc/delivery";
import {AppletView} from "@lightningrodlabs/we-applet";

export const devtestNames: DevTestNames = {
    installed_app_id: "files-we_applet",
    provisionedRoleName: FILES_DEFAULT_ROLE_NAME,
}

//----------------------------------------------------------------------------------------------------------------------
// Block Views
//----------------------------------------------------------------------------------------------------------------------

// export type BlockViewInfo = {
//     type: "block";
//     block: string;
//     context: any;
// }

/** */
export function setupFilesBlockView(blockName: string) {
    const context: ViewFileContext = {
        detail: "none",
    }
    const appletView = {
        type: "block",
        block: blockName,
        context,
    } as AppletView;
    return setupDevtest(createFileShareApplet, devtestNames, createDefaultWeServicesMock, appletView);
}


//----------------------------------------------------------------------------------------------------------------------
// Entry Views
//----------------------------------------------------------------------------------------------------------------------

/** */
export async function setupFilesEntryView() {
    console.log("setupThreadsEntryView()");
    const context: ViewFileContext = {
        detail: "none",
    }
    const appletView = createManifestEntryRenderInfo(await fakeActionHash(), context);
    return setupDevtest(createFileShareApplet, devtestNames, createDefaultWeServicesMock, appletView);
}


/** */
function createManifestEntryRenderInfo(eh: EntryHash, context: ViewFileContext): EntryViewInfo {
    const entryInfo = emptyEntryAppletView as EntryViewInfo;
    entryInfo.roleName = FILES_DEFAULT_ROLE_NAME;
    entryInfo.integrityZomeName = DELIVERY_INTERGRITY_ZOME_NAME;
    entryInfo.entryType = snake(DeliveryEntryType.PublicManifest);
    entryInfo.hrl[1] = eh;
    entryInfo.context = context;

    return entryInfo;
}
