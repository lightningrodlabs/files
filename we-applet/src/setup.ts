import {WeClient} from "@lightningrodlabs/we-applet";
import {setBasePath, getBasePath} from '@shoelace-style/shoelace/dist/utilities/base-path.js';
import {delay} from "@ddd-qc/lit-happ";
import {appletServices} from "./files-applet/appletServices";
import {setupDevtest} from "./setupDevtest";

export async function setup(createApplet) {
    let BUILD_MODE = "prod";
    try {
        BUILD_MODE = process.env.BUILD_MODE;
    } catch (e) {
        console.log(`BUILD_MODE env variable not set. Defaulting to "prod".`)
    }
    console.log("BUILD_MODE", BUILD_MODE);

    if (BUILD_MODE == "devtest") {
        setupDevtest(createApplet);
    } else {
        setupProd(createApplet);
    }
}

/** */
export async function setupProd(createApplet) {
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
    const applet = await createApplet(renderInfo.appletClient, weClient.appletHash, renderInfo.profilesClient, weClient);
    console.log("applet", applet);
    document.body.append(applet);
}
