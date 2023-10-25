//import '@shoelace-style/shoelace/dist/themes/light.css';
import {WeClient} from "@lightningrodlabs/we-applet";
import {setBasePath, getBasePath} from '@shoelace-style/shoelace/dist/utilities/base-path.js';
import {delay} from "@ddd-qc/lit-happ";
import {createFileShareApplet} from "./createFileShareApplet";
import {appletServices} from "./appletServices/appletServices";

/** */
export async function setup() {
    console.log("setup()");

    setBasePath('./');
    console.log("shoelace basePath", getBasePath());


    console.log("WeClient.connect()...", WeClient);
    const weClient = await WeClient.connect(appletServices);
    console.log("weClient", weClient);
    if (weClient.renderInfo.type != "applet-view") {
        console.error("Setup called for non 'applet-view' type")
        return;
    }

    /** Delay because of We 'CellDisabled' bug at startup race condition */
    await delay(1000);

    const renderInfo = weClient.renderInfo as any;
    const applet = await createFileShareApplet(renderInfo.appletClient, weClient.appletHash, renderInfo.profilesClient, weClient,);
    console.log("applet", applet);
    document.body.append(applet);
}
