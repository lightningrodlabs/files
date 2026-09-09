import {setup, wrapPathInSvg} from "@ddd-qc/we-utils";
import {createFilesApplet} from "./createFilesApplet";
import {AppletServices, initializeHotReload} from "@theweave/api";
import {getAssetInfo} from "./appletServices/getAssetInfo";
import {DeliveryEntryType} from "@ddd-qc/delivery";
import {devtestNames, setupFilesEntryView} from "./devtest";
import {search} from "./appletServices/search";
import {mdiFileOutline} from "@mdi/js";


/** */
export async function setupFilesApplet() {
    /** When Moss serves this applet from a dev server (we_dev/config.ts with
     *  source.type "localhost") the iframe is on http://localhost:<uiPort>
     *  rather than Moss's own applet origin, so the bridge that WeaveClient
     *  connects over has to be set up explicitly first. Without this,
     *  we-utils' setup() awaits a connection that never arrives and the applet
     *  renders nothing, with no error. Every other tool in the fleet does this
     *  (kando, emergence, talking-stickies, gamez); files only ever ran from a
     *  packed webhapp, where Moss serves the UI itself and no bridge is needed.
     *  Dev only: in a packaged webhapp this is both unnecessary and unavailable. */
    if ((import.meta as any).env?.DEV) {
        try {
            await initializeHotReload();
        } catch (e) {
            console.warn("Applet hot-reload not initialized. Expected unless running under `npm run start:moss`.", e);
        }
    }
    /** Determine appletView */
    let APPLET_VIEW = "main";
    try {
        APPLET_VIEW = process.env.APPLET_VIEW!;
        //console.log(`HAPP_ENV defined by process.ENV: "${happEnv}"`);
    } catch (e:any) {
    }
    console.log("Files we-applet setup() APPLET_VIEW", APPLET_VIEW);
    switch(APPLET_VIEW) {
        /** Entry views */
        case DeliveryEntryType.PrivateManifest:
        case DeliveryEntryType.PublicManifest: return setupFilesEntryView();
        ///** Block views */
        //case FilesBlockType.PickFile:
        //case FilesBlockType.ImportFile: return setupFilesBlockView(APPLET_VIEW);
        /** Main View */
        case "main":
        default: return setupFilesMainView();
    }
}


/** */
async function setupFilesMainView() {
    const appletServices: AppletServices = {
        creatables: {
            file: {
                label: "File",
                icon_src: wrapPathInSvg(mdiFileOutline),
            }
        },
        getAssetInfo,
        search,
        //bindAsset,
    };
    console.log("setupFilesMainView()")
    return setup(appletServices, createFilesApplet, devtestNames);
}



// /** */
// export async function bindAsset(
//   _appletClient: AppClient,
//   _srcWal: WAL,
//   _dstWal: WAL,
//   _dstRecordInfo?: RecordInfo,
// ): Promise<void> {
//     /* FIXME */
// }

export default setupFilesApplet;
