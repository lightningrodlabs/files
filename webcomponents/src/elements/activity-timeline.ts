import {css, html, PropertyValues} from "lit";
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
import {AgentPubKeyB64, EntryHashB64, Timestamp} from "@holochain/client";


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
    determineHistory() {
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

        const sortedReceptions: [Timestamp, EntryHashB64, DeliveryEntryType][] = Object.entries(this.deliveryPerspective.receptions)
            .map(([eh, [rp, ts]]) => [ts, eh, DeliveryEntryType.ReceptionProof])
        console.log("sortedReceptions", sortedReceptions);

        const sortedReceptionAcks: [Timestamp, EntryHashB64, DeliveryEntryType][] = Object.entries(this.deliveryPerspective.receptionAcks)
            .map(([eh, [rp, ts]]) => [ts, eh, DeliveryEntryType.ReceptionAck])
        console.log("sortedReceptionAcks", sortedReceptionAcks);

        const sortedPrivateParcels: [Timestamp, EntryHashB64, DeliveryEntryType][] = Object.entries(this.deliveryPerspective.privateManifests)
            .map(([eh, [rp, ts]]) => [ts, eh, DeliveryEntryType.ParcelManifest])
        console.log("sortedPrivateParcels", sortedPrivateParcels);

        const sortedPublicParcels: [Timestamp, EntryHashB64, DeliveryEntryType][] = Object.entries(this.deliveryPerspective.publicParcels)
            .map(([eh, [rp, ts, auth]]) => [ts, eh, DeliveryEntryType.PublicParcel])
        console.log("sortedPublicParcels", sortedPublicParcels);

        const all = sortedReceptions.concat(sortedReceptions, sortedReceptionAcks, sortedPrivateParcels, sortedPublicParcels)
            .sort(([ts1, _eh1, _t1], [ts2, _eh2, _t2]) => ts2 - ts1);
        console.table(all);


    }

    /** */
    render() {
        console.log("<activity-timeline>.render()", this._dvm.deliveryZvm.perspective, this._profilesZvm.perspective);
        this.determineHistory();
        /** Render all */
        return html``;
    }
}

/*
received file from
sent file to
Bob published file
Added file
*/
