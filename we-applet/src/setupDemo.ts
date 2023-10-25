import {
    AdminWebsocket, AppAgentWebsocket, encodeHashToBase64, fakeDnaHash, decodeHashFromBase64,
} from "@holochain/client";
import { fakeEntryHash } from '@holochain-open-dev/utils';
import { ProfilesClient } from '@holochain-open-dev/profiles';
import { ProfilesZomeMock } from "@holochain-open-dev/profiles/dist/mocks.js";
import { setBasePath, getBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js';


/** */
export async function setupDemo(filesAPI: any) {
    console.log("setupDemo()", process.env.BUILD_MODE, process.env.HC_APP_PORT, process.env.HC_ADMIN_PORT);

    setBasePath('../../node_modules/@shoelace-style/shoelace/dist');
    console.log("shoelace basePath", getBasePath());

    /** Store AppletId in LocalStorage, so we can retrieve it when refereshing webpage */
    let fileShareAppletId;
    let fileShareAppletIdB64 = window.localStorage['fileShareDemoAppletId'];
    if (!fileShareAppletIdB64) {
        fileShareAppletId = fakeEntryHash();
        fileShareAppletIdB64 = encodeHashToBase64(fileShareAppletId);
        window.localStorage['fileShareDemoAppletId'] = fileShareAppletIdB64;
    } else {
        fileShareAppletId = decodeHashFromBase64(fileShareAppletIdB64);
    }

    /** Create custom WeServiceMock */
    console.log("setupDemo() fileShareDemoAppletId", fileShareAppletIdB64);
    const myWeServicesMock = filesAPI.weServicesMock;
    myWeServicesMock.appletInfo = async (appletId) => {
        const appletIdB64 = encodeHashToBase64(appletId);
        console.log("setupDemo() myWeServicesMock.appletInfo()", appletIdB64, fileShareAppletIdB64);
        if (appletIdB64 == fileShareAppletIdB64) {
            return {
                appletBundleId: await fakeEntryHash(),
                appletName: "DevTestWeApplet",
                groupIds: [await fakeDnaHash()],
            }
        }
        return undefined;
    };
    myWeServicesMock.entryInfo = async (hrl) => {
        return {
            appletId: fileShareAppletId,
            entryInfo: {
                icon_src: "",
                name: "demo:" + encodeHashToBase64(hrl[1]),
            }
        }
    }

    /** AppWebsocket */
    // const appWs = await AppWebsocket.connect(`ws://localhost:${process.env.HC_APP_PORT}`);
    // const appInfo = await appWs.appInfo({installed_app_id: "file_share-applet"});
    // console.log("setup() appInfo", appInfo);

    /** AppAgentWebsocket */
    const appAgentWs = await AppAgentWebsocket.connect(new URL(`ws://localhost:${process.env.HC_APP_PORT}`), "file_share-applet");
    console.log(appAgentWs.appWebsocket);
    const appInfo = await appAgentWs.appInfo();
    console.log(appInfo);
    const cellInfo = appInfo.cell_info['rFileShare'][0];
    let cellId;
    if ("provisioned" in cellInfo) {
        cellId = cellInfo.provisioned.cell_id;
    } else {
        console.error("Cell found is not a 'provisioned");
    }
    //console.log("main agentId", cellId[1]);
    //console.log("main agentId", encodeHashToBase64(cellId[1]));

    /** AdminWebsocket */
    const adminWs = await AdminWebsocket.connect(new URL(`ws://localhost:${process.env.HC_ADMIN_PORT}`));
    const apps = await adminWs.listApps({});
    console.log("setupDemo() apps", apps);
    await adminWs.authorizeSigningCredentials(cellId);

    /** Creating mock lobby app with profiles dna & zome */
    const mockProfilesZome = new ProfilesZomeMock();
    //console.log("mock agentId", mockProfilesZome.myPubKey);
    mockProfilesZome.myPubKey = cellId[1];
    //console.log("mock agentId", encodeHashToBase64(mockProfilesZome.myPubKey));
    mockProfilesZome.create_profile({nickname: "Alex", fields: {}})
    const mockAppInfo = await mockProfilesZome.appInfo();
    console.log("mockAppInfo", mockAppInfo);
    const applet = await filesAPI.createFileShareApplet(
        appAgentWs,
        fileShareAppletId,
        new ProfilesClient((mockProfilesZome as any), /*mockProfilesZome.roleName*/ "lobby"),
        myWeServicesMock,
    );
    //renderers.main(document.body);
    console.log("setupDemo() applet", applet);
    document.body.append(applet);
}
