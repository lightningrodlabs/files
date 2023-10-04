import {css, html, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {FileShareDvm} from "../viewModels/fileShare.dvm";
import {FileShareDvmPerspective} from "../viewModels/fileShare.perspective";
import {FileSharePerspective} from "../viewModels/fileShare.zvm";
import {DeliveryPerspective} from "@ddd-qc/delivery";
import {consume} from "@lit-labs/context";
import {globalProfilesContext} from "../viewModels/happDef";
import {ProfilesZvm} from "../viewModels/profiles.zvm";
import {sharedStyles} from "../sharedStyles";


/** */
export enum SelectedType {
    Home = 'Home',
    AllFiles = 'All Files',
    PublicFiles = 'Public Files',
    PrivateFiles = 'Private Files',
    Inbox = 'Inbox',
    Sent = 'Sent',
    InProgress = 'In Progress',
}


/**
 * @element
 */
@customElement("file-share-menu")
export class FileSharePage extends DnaElement<FileShareDvmPerspective, FileShareDvm> {

    /** Observed perspective from zvm */
    @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
    fileSharePerspective!: FileSharePerspective;

    @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
    deliveryPerspective!: DeliveryPerspective;

    @consume({ context: globalProfilesContext, subscribe: true })
    _profilesZvm!: ProfilesZvm;


    @state() private _initialized = false;

    /**
     * In dvmUpdated() this._dvm is not already set!
     * Subscribe to ZVMs
     */
    protected async dvmUpdated(newDvm: FileShareDvm, oldDvm?: FileShareDvm): Promise<void> {
        console.log("<file-view>.dvmUpdated()");
        if (oldDvm) {
            console.log("\t Unsubscribed to Zvms roleName = ", oldDvm.fileShareZvm.cell.name)
            oldDvm.fileShareZvm.unsubscribe(this);
            oldDvm.deliveryZvm.unsubscribe(this);
        }
        newDvm.fileShareZvm.subscribe(this, 'fileSharePerspective');
        newDvm.deliveryZvm.subscribe(this, 'deliveryPerspective');
        console.log("\t Subscribed Zvms roleName = ", newDvm.fileShareZvm.cell.name)
        await newDvm.fileShareZvm.probeAll();
        this._initialized = true;
    }


    onSelected(e) {
        //console.log("<file-share-menu> onSelected", e);
        console.log("<file-share-menu> onSelected", e.detail);
        console.log("<file-share-menu> onSelected", e.detail.item.getTextLabel().trim());
        this.dispatchEvent(new CustomEvent('selected', {detail: e.detail.item.getTextLabel().trim(), bubbles: true, composed: true}));
    }

    /** */
    render() {
        console.log("<file-share-menu>.render()", this._initialized);

        let localPublicCount = 0;
        let dhtPublicCount = 0;
        let privateCount = 0;
        let unrepliedCount = 0;
        let distribCount = 0;
        let outboundCount = 0;
        if (this._initialized) {
            dhtPublicCount = Object.entries(this.perspective.publicFiles).length;
            localPublicCount = Object.entries(this.deliveryPerspective.localPublicManifests).length;
            privateCount = Object.entries(this.fileSharePerspective.privateFiles).length;
            unrepliedCount = Object.entries(this._dvm.deliveryZvm.inbounds()).length;
            distribCount = Object.entries(this._dvm.deliveryZvm.perspective.distributions).length;
            outboundCount = Object.entries(this._dvm.deliveryZvm.outbounds()).length;
        }

        /** render all */
        return html`
            <div>
                <img src="assets/icon.png" width="32" height="32" alt="favicon" style="padding-left: 5px;padding-top: 5px;"/>
                <span id="title"">Whatever</span>
            </div>
            <sl-menu @sl-select=${this.onSelected}>
                <sl-menu-item class="selectedItem">
                    <sl-icon slot="prefix" name="house"></sl-icon>
                    ${SelectedType.Home}
                </sl-menu-item>
                <sl-menu-item>                    
                    <sl-icon slot="prefix" name="files"></sl-icon>
                    ${SelectedType.AllFiles}
                    ${this._initialized? html`<sl-badge slot="suffix" variant="neutral" pill>${localPublicCount + dhtPublicCount + privateCount}</sl-badge>`: html`<sl-skeleton slot="suffix" effect="sheen"></sl-skeleton>`}
                </sl-menu-item>
                <sl-menu-item>
                    <sl-icon slot="prefix" name="hdd"></sl-icon>
                    ${SelectedType.PrivateFiles}
                    ${this._initialized? html`<sl-badge slot="suffix" variant="neutral" pill>${privateCount}</sl-badge>`: html`<sl-skeleton slot="suffix" effect="sheen"></sl-skeleton>`}
                </sl-menu-item>
                <sl-menu-item>
                    <sl-icon slot="prefix" name="people"></sl-icon>
                    ${SelectedType.PublicFiles}
                    ${this._initialized? html`<sl-badge slot="suffix" variant="neutral" pill>${localPublicCount + dhtPublicCount}</sl-badge>`: html`<sl-skeleton slot="suffix" effect="sheen"></sl-skeleton>`}
                </sl-menu-item>
                <sl-menu-item>
                    <sl-icon slot="prefix" name="download"></sl-icon>
                    ${SelectedType.Inbox}
                    ${this._initialized? html`<sl-badge slot="suffix" variant=${unrepliedCount > 0? "primary" : "neutral"} pill>${unrepliedCount}</sl-badge>`: html`<sl-skeleton slot="suffix" effect="sheen"></sl-skeleton>`}
                </sl-menu-item>
                <sl-menu-item>
                    <sl-icon slot="prefix" name="send"></sl-icon>
                    ${SelectedType.Sent}
                    ${this._initialized? html`<sl-badge slot="suffix" variant="neutral" pill>${distribCount - outboundCount}</sl-badge>`: html`<sl-skeleton slot="suffix" effect="sheen"></sl-skeleton>`}
                </sl-menu-item>
                <sl-menu-item>
                    <sl-icon slot="prefix" name="arrow-left-right"></sl-icon>
                    ${SelectedType.InProgress}
                    ${this._initialized? html`<sl-badge slot="suffix" variant=${outboundCount > 0? "primary" : "neutral"} pill>${outboundCount}</sl-badge>`: html`<sl-skeleton slot="suffix" effect="sheen"></sl-skeleton>`}
                </sl-menu-item>
                <sl-divider></sl-divider>
                <!-- <sl-skeleton effect="sheen"></sl-skeleton>
                <sl-skeleton effect="sheen"></sl-skeleton>
                <sl-skeleton effect="sheen"></sl-skeleton> -->
            </sl-menu>
        `;
    }

    /** */
    static get styles() {
        return [
            sharedStyles,
            css`
              :host {
                background: #E8F0F3;
                display: block;
                overflow-y: auto;
                height: 100%;
              }

              sl-menu {
                width: 100%;
                background: #E8F0F3;
                border: none;
              }
              #title {
                margin: 5px;
                font-size: 32px;
                font-weight: bold;
              }
              sl-menu-item {
                margin-bottom: 7px;
              }
              .selectedItem {
                background: #FFFFFF;
                box-shadow: rgba(0, 0, 0, 0.35) 0px 5px 15px;
                margin-left: 5px;
                margin-right: 5px;
                border-radius: 5px;
              }
            `,];
    }
}
