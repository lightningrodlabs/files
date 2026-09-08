import {createDefaultWeServicesMock, DevTestNames, AssetViewInfo, setupDevtest} from "@ddd-qc/we-utils";
import {FILES_DEFAULT_ROLE_NAME} from "@ddd-qc/files";
import {emptyEntryAppletView} from "@ddd-qc/we-utils/dist/mocks/renderInfoMock";
import {EntryId, snake} from "@ddd-qc/cell-proxy";
import {createFilesApplet, ViewFileContext} from "./createFilesApplet";
import {DELIVERY_INTERGRITY_ZOME_NAME, DeliveryEntryType} from "@ddd-qc/delivery";

export const devtestNames: DevTestNames = {
    installed_app_id: "Files",
    provisionedRoleName: FILES_DEFAULT_ROLE_NAME,
}

//----------------------------------------------------------------------------------------------------------------------
// Entry Views
//----------------------------------------------------------------------------------------------------------------------

/** */
export async function setupFilesEntryView() {
    console.log("setupFilesEntryView()");
    const context: ViewFileContext = {
        detail: "none",
    }
    const appletView = createManifestEntryRenderInfo(EntryId.empty(), context);
    return setupDevtest(createFilesApplet, devtestNames, createDefaultWeServicesMock, appletView);
}


/** */
function createManifestEntryRenderInfo(eh: EntryId, context: ViewFileContext): AssetViewInfo {
    const entryInfo = emptyEntryAppletView;// as AssetViewInfo;
    entryInfo.recordInfo = {
        roleName: FILES_DEFAULT_ROLE_NAME,
        integrityZomeName: DELIVERY_INTERGRITY_ZOME_NAME,
        entryType: snake(DeliveryEntryType.PublicManifest),
    };
    entryInfo.wal.hrl[1] = eh.hash;
    entryInfo.wal.context = context;

    return entryInfo;
}
