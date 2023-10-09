import {css, html, PropertyValues, TemplateResult} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {delay, DnaElement} from "@ddd-qc/lit-happ";
import {consume} from "@lit-labs/context";
import {FileShareDvm} from "../viewModels/fileShare.dvm";
import {FileShareProfile} from "../viewModels/profiles.proxy";
import {ProfilesZvm} from "../viewModels/profiles.zvm";
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
import {getInitials, mime2icon, prettyFiletype} from "../utils";
import {SlDialog, SlDrawer} from "@shoelace-style/shoelace";
import {FileView} from "./file-view";
import {sharedStyles} from "../sharedStyles";


/**
 * @element
 */
@customElement("activity-timeline")
export class ActivityTimeline extends DnaElement<unknown, FileShareDvm> {

    /** Observed perspective from zvm */
    @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
    deliveryPerspective!: DeliveryPerspective;

    @consume({ context: globalProfilesContext, subscribe: true })
    _profilesZvm!: ProfilesZvm;



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
            .map(([ah, acks]) => {
                const res: [Timestamp, ActionHashB64, DeliveryEntryType][] =  Object.entries(acks)
                    .map(([_agent, [_ack, ts]]) => [ts, ah, DeliveryEntryType.ReceptionAck]);
                return res;
            }).flat()

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

        //console.table(all);
        return all;
    }



    /** */
    activityLog2Html([ts, hash, type]: [Timestamp, EntryHashB64 | ActionHashB64, DeliveryEntryType]): TemplateResult<1> {

        /** Format date */
        const date = new Date(ts / 1000); // Holochain timestamp is in micro-seconds, Date wants milliseconds
        const date_str = date.toLocaleString('en-US', {hour12: false});

        /** Determine File */
        //let fileDescription: ParcelDescription;
        let manifestEh: EntryHashB64;
        if (type == DeliveryEntryType.ParcelManifest) {
            const manifest = this.deliveryPerspective.privateManifests[hash][0];
            if (!manifest) {
                return html`<sl-skeleton effect="sheen"></sl-skeleton>`
            }
            //fileDescription = manifest.description;
            manifestEh = hash;
        }
        if (type == DeliveryEntryType.ReceptionAck) {
            const distrib = this.deliveryPerspective.distributions[hash][0];
            //fileDescription = distrib.delivery_summary.parcel_reference.description;
            manifestEh = encodeHashToBase64(distrib.delivery_summary.parcel_reference.eh);
        }
        if (type == DeliveryEntryType.ReceptionProof) {
            const notice = this.deliveryPerspective.notices[hash][0];
            //fileDescription = notice.summary.parcel_reference.description;
            manifestEh = encodeHashToBase64(notice.summary.parcel_reference.eh);
        }
        if (type == DeliveryEntryType.PublicParcel) {
            //fileDescription = this.deliveryPerspective.publicParcels[hash][0];
            manifestEh = hash;
        }


        /** Determine author */
        let author: AgentPubKeyB64;
        if (type == DeliveryEntryType.ParcelManifest) {
            author = this.cell.agentPubKey;
        }
        if (type == DeliveryEntryType.ReceptionAck) {
            const [recipient, [_ack, _ts]] = Object.entries(this.deliveryPerspective.receptionAcks[hash])[0];
            author = recipient
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
            message = `was added privately by`;
        }
        if (type == DeliveryEntryType.ReceptionAck) {
            message = `was received by`;
        }
        if (type == DeliveryEntryType.ReceptionProof) {
            message = `was sent to you by`;
        }
        if (type == DeliveryEntryType.PublicParcel) {
            message = `was published by`;
        }

        const authorSpan = author == this.cell.agentPubKey
            ? html`<span style="font-weight: bold;">yourself</span>`
            : html`<span class="nickname">${agent.nickname}</span>`;

        const avatar =
        avatarUrl? html`
          <sl-avatar class="activityAvatar" style="box-shadow: 1px 1px 1px 1px rgba(130, 122, 122, 0.88)">
              <img src=${avatarUrl}>
        </sl-avatar>                   
            ` : html`
        <sl-avatar class="activityAvatar" shape="circle" initials=${initials} color-scheme="Accent2"></sl-avatar>
                `;


        /** render */
        return html`
        <div class="activityItem">
            <div class="activityDate"> ${date_str}</div>            
            <div id=${id} class="activityLine">
                <file-button .hash="${manifestEh}"></file-button>
                <div class="activityMsg">
                    ${message}
                    ${authorSpan}
                </div>
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
                //console.log("activityLog", activityLog);
                return this.activityLog2Html(activityLog);
            }
        )
        if (items.length == 0) {
            items.push(html`None`);
        }


        /** Render all */
        return html`${items}`;
    }


    /** */
    static get styles() {
        return [
            sharedStyles,
            css`
              .activityItem {
                display: flex;
                flex-direction: row-reverse;
                align-content: center;
                align-items: center;
                margin-bottom: 10px;
              }

              .activityLine {
                display: flex;
                flex-direction: row;
                min-height: 45px;
                align-content: center;
                align-items: center;
                flex-grow: 2;
              }

              .activityAvatar {
                margin-right: 5px;
                min-width: 48px;
              }

              .activityDate {
                margin: 0px 0px 0px 5px;
                font-size: small;
                color: gray;
              }
              .activityMsg {
                margin: 5px 5px 5px 5px;
              }
            `,];
    }

}
