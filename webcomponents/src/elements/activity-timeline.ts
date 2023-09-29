import {css, html, PropertyValues, TemplateResult} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {delay, DnaElement} from "@ddd-qc/lit-happ";
import {consume} from "@lit-labs/context";
import {FileShareDvm} from "../viewModels/fileShare.dvm";
import {FileShareProfile} from "../viewModels/profiles.proxy";
import {ProfilesZvm} from "../viewModels/profiles.zvm";
import {FileSharePerspective} from "../viewModels/fileShare.zvm";
import {
    DeliveryEntryType,
    DeliveryPerspective,
    ParcelDescription,
    ParcelManifest,
    ReceptionAck,
    ReceptionProof
} from "@ddd-qc/delivery";
import {globalProfilesContext} from "../viewModels/happDef";
import {ActionHashB64, AgentPubKeyB64, encodeHashToBase64, EntryHashB64, Timestamp} from "@holochain/client";
import {getInitials} from "../utils";
import {SlDialog, SlDrawer} from "@shoelace-style/shoelace";
import {FileView} from "./file-view";


/**
 * @element
 */
@customElement("activity-timeline")
export class ActivityTimeline extends DnaElement<unknown, FileShareDvm> {

    /** Observed perspective from zvm */
    @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
    fileSharePerspective!: FileSharePerspective;

    @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
    deliveryPerspective!: DeliveryPerspective;

    @consume({ context: globalProfilesContext, subscribe: true })
    _profilesZvm!: ProfilesZvm;


    get dialogElem() : SlDialog {
        return this.shadowRoot.getElementById("file-dialog") as SlDialog;
    }

    get fileViewElem() : FileView {
        return this.shadowRoot.getElementById("file-view") as FileView;
    }


    /**
     * In dvmUpdated() this._dvm is not already set!
     * Subscribe to ZVMs
     */
    protected async dvmUpdated(newDvm: FileShareDvm, oldDvm?: FileShareDvm): Promise<void> {
        console.log("<activity-timeline>.dvmUpdated()");
        if (oldDvm) {
            //console.log("\t Unsubscribed to Zvms roleName = ", oldDvm.fileShareZvm.cell.name)
            oldDvm.fileShareZvm.unsubscribe(this);
            oldDvm.deliveryZvm.unsubscribe(this);
        }
        newDvm.fileShareZvm.subscribe(this, 'fileSharePerspective');
        newDvm.deliveryZvm.subscribe(this, 'deliveryPerspective');
        //console.log("\t Subscribed Zvms roleName = ", newDvm.fileShareZvm.cell.name)
    }


    /** */
    determineHistory(): [Timestamp, EntryHashB64 | ActionHashB64, DeliveryEntryType][] {
        // const sortedReceptions: [Timestamp, EntryHashB64, ReceptionProof][] = Object.entries(this.deliveryPerspective.receptions)
        //     .sort(([_eh1, [_rp1, ts1]], [_eh2, [_rp2, ts2]]) => ts2 - ts1)
        //     .map(([eh, [rp, ts]]) => [ts, eh, rp])
        // console.log("sortedReceptions", sortedReceptions);
        //
        // const sortedReceptionAcks: [Timestamp, EntryHashB64, ReceptionAck][] = Object.entries(this.deliveryPerspective.receptionAcks)
        //     .sort(([_eh1, [_rp1, ts1]], [_eh2, [_rp2, ts2]]) => ts2 - ts1)
        //     .map(([eh, [rp, ts]]) => [ts, eh, rp])
        // console.log("sortedReceptionAcks", sortedReceptionAcks);
        //
        // const sortedPrivateParcels: [Timestamp, EntryHashB64, ParcelManifest][] = Object.entries(this.deliveryPerspective.privateManifests)
        //     .sort(([_eh1, [_rp1, ts1]], [_eh2, [_rp2, ts2]]) => ts2 - ts1)
        //     .map(([eh, [rp, ts]]) => [ts, eh, rp])
        // console.log("sortedPrivateParcels", sortedPrivateParcels);
        //
        // const sortedPublicParcels: [Timestamp, EntryHashB64, ParcelDescription, AgentPubKeyB64][] = Object.entries(this.deliveryPerspective.publicParcels)
        //     .sort(([_eh1, [_rp1, ts1, auth1]], [_eh2, [_rp2, ts2, _auth2]]) => ts2 - ts1)
        //     .map(([eh, [rp, ts, auth]]) => [ts, eh, rp, auth])
        // console.log("sortedPublicParcels", sortedPublicParcels);

        /** Remove Received files from private files */
        const receivedManifestEhs: EntryHashB64[] = Object.values(this.deliveryPerspective.receptions)
            .map(([rp,_ts]) => encodeHashToBase64(this.deliveryPerspective.notices[encodeHashToBase64(rp.notice_eh)][0].summary.parcel_reference.eh));


        const sortedReceptions: [Timestamp, EntryHashB64, DeliveryEntryType][] = Object.entries(this.deliveryPerspective.receptions)
            .map(([eh, [rp, ts]]) => [ts, eh, DeliveryEntryType.ReceptionProof])
        //console.log("sortedReceptions", sortedReceptions);

        const sortedReceptionAcks: [Timestamp, ActionHashB64, DeliveryEntryType][] = Object.entries(this.deliveryPerspective.receptionAcks)
            .map(([ah, [rp, ts]]) => [ts, ah, DeliveryEntryType.ReceptionAck])
        //console.log("sortedReceptionAcks", sortedReceptionAcks);

        const sortedPrivateParcels: [Timestamp, EntryHashB64, DeliveryEntryType][] = Object.entries(this.deliveryPerspective.privateManifests)
            .filter(([eh, [rp, ts]]) => !receivedManifestEhs.includes(eh))
            .map(([eh, [rp, ts]]) => [ts, eh, DeliveryEntryType.ParcelManifest])
        //console.log("sortedPrivateParcels", sortedPrivateParcels);

        const sortedPublicParcels: [Timestamp, EntryHashB64, DeliveryEntryType][] = Object.entries(this.deliveryPerspective.publicParcels)
            .map(([eh, [rp, ts, auth]]) => [ts, eh, DeliveryEntryType.PublicParcel])
        //console.log("sortedPublicParcels", sortedPublicParcels);

        /** Concat all */
        const all = sortedReceptions.concat(sortedReceptionAcks, sortedPrivateParcels, sortedPublicParcels)
            .sort(([ts1, _eh1, _t1], [ts2, _eh2, _t2]) => ts2 - ts1);
        console.table(all);

        return all;
    }



    /**
     received file from
     sent file to
     Bob published file
     Added file
     */
    activityLog2Html([ts, hash, type]: [Timestamp, EntryHashB64 | ActionHashB64, DeliveryEntryType]): TemplateResult<1> {

        /** Format date */
        const date = new Date(ts / 1000); // Holochain timestamp is in micro-seconds, Date wants milliseconds
        const date_str = date.toLocaleString('en-US', {hour12: false});

        /** Determine File */
        let fileDescription: ParcelDescription;
        let manifestEh: EntryHashB64;
        if (type == DeliveryEntryType.ParcelManifest) {
            const manifest = this.fileSharePerspective.privateFiles[hash];
            fileDescription = manifest.description;
            manifestEh = hash;
        }
        if (type == DeliveryEntryType.ReceptionAck) {
            const distrib = this.deliveryPerspective.distributions[hash][0];
            fileDescription = distrib.delivery_summary.parcel_reference.description;
            manifestEh = encodeHashToBase64(distrib.delivery_summary.parcel_reference.eh);
        }
        if (type == DeliveryEntryType.ReceptionProof) {
            const notice = this.deliveryPerspective.notices[hash][0];
            fileDescription = notice.summary.parcel_reference.description;
            manifestEh = encodeHashToBase64(notice.summary.parcel_reference.eh);
        }
        if (type == DeliveryEntryType.PublicParcel) {
            fileDescription = this.deliveryPerspective.publicParcels[hash][0];
            manifestEh = hash;
        }


        /** Determine author */
        let author: AgentPubKeyB64;
        if (type == DeliveryEntryType.ParcelManifest) {
            author = this.cell.agentPubKey;
        }
        if (type == DeliveryEntryType.ReceptionAck) {
            const ack = this.deliveryPerspective.receptionAcks[hash][0];
            author = encodeHashToBase64(ack.recipient);
        }
        if (type == DeliveryEntryType.ReceptionProof) {
            const notice = this.deliveryPerspective.notices[hash][0];
            author = encodeHashToBase64(notice.sender);
        }
        if (type == DeliveryEntryType.PublicParcel) {
            author = this.deliveryPerspective.publicParcels[hash][2];
        }

        let agent = {nickname: "unknown", fields: {}} as FileShareProfile;
        const maybeAgent = this._profilesZvm.perspective.profiles[author];
        if (maybeAgent) {
            agent = maybeAgent;
        } else {
            console.log("Profile not found for agent", author, this._profilesZvm.perspective.profiles)
            //this._profilesZvm.probeProfile(texto.author)
            //.then((profile) => {if (!profile) return; console.log("Found", profile.nickname)})
        }

        const initials = getInitials(agent.nickname);
        const avatarUrl = agent.fields['avatar'];

        const id = "activity-item__" + hash;

        /** Format phrase */
        let message: string;
        if (type == DeliveryEntryType.ParcelManifest) {
            message = `added a file`;
        }
        if (type == DeliveryEntryType.ReceptionAck) {
            message = `received your file`;
        }
        if (type == DeliveryEntryType.ReceptionProof) {
            message = `sent you a file`;
        }
        if (type == DeliveryEntryType.PublicParcel) {
            message = `published a file`;
        }

        /** render */
        return html`
        <div id=${id} class="activityItem">
            ${avatarUrl? html`
                      <sl-avatar class="activityAvatar" style="box-shadow: 1px 1px 1px 1px rgba(130, 122, 122, 0.88)">
                          <img src=${avatarUrl}>
                      </sl-avatar>                   
                          ` : html`
                        <sl-avatar class="activityAvatar" shape="circle" initials=${initials} color-scheme="Accent2"></sl-avatar>
                  `}
            <div style="display: flex; flex-direction: column">
                <div class="activityMsg">
                    ${author == this.cell.agentPubKey? html`You` : html`<abbr title=${author}><span><b>${agent.nickname}</b></span></abbr>`}
                    ${message}
                </div>
                <div class="activityDate"> ${date_str}</div>
                <sl-button pill 
                           @click=${() => {this.fileViewElem.hash = manifestEh; this.dialogElem.show();}}>
                    ${fileDescription.name}
                </sl-button>
            </div>
        </div>
    `;
    }


    /** */
    render() {
        console.log("<activity-timeline>.render()", this._dvm.deliveryZvm.perspective, this._profilesZvm.perspective);
        const history = this.determineHistory();


        const items = history.map(
            (activityLog) => {
                console.log("activityLog", activityLog);
                return this.activityLog2Html(activityLog);
            }
        )
        if (items.length == 0) {
            items.push(html`None`);
        }


        /** Render all */
        return html`
        <div>
            <h3>Today</h3>
            ${items}
            <sl-dialog id="file-dialog" label="Details">
                <file-view id="file-view"></file-view>
                <sl-button slot="footer" variant="primary">Close</sl-button>
            </sl-dialog>
        </div>`;
    }


    /** */
    static get styles() {
        return [
            css`
        .activityItem {
          display: flex; 
          flex-direction: row;
          min-height: 55px;
          margin: 5px 5px 35px 5px;
        }
        .activityAvatar {
          margin-right: 5px;
          min-width: 48px;
        }
        .activityDate {
          margin: 0px 0px 0px 5px;
          font-size: smaller;
          color: gray;
        }
        .activityMsg {
          margin: 5px 5px 5px 5px;
        }        
      `,];
    }

}
