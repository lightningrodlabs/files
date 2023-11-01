import {AppProxy, delay, DnaViewModel, HCL, ZvmDef} from "@ddd-qc/lit-happ";
import {
    DeliveryProperties,
    DeliveryZvm, ParcelChunk, ParcelDescription, ParcelKindVariantManifest,
    ParcelManifest, ParcelReference,
    SignalProtocol,
    SignalProtocolType
} from "@ddd-qc/delivery";
import {
    ActionHashB64,
    AgentPubKeyB64,
    AppSignalCb,
    decodeHashFromBase64, encodeHashToBase64,
    EntryHash,
    EntryHashB64,
} from "@holochain/client";
import {AppSignal} from "@holochain/client/lib/api/app/types";

import {FileShareZvm} from "./fileShare.zvm";
import {base64ToArrayBuffer, splitFile, SplitObject} from "../utils";
import { decode } from "@msgpack/msgpack";
import {
    FileShareDvmPerspective,
    FileShareNotificationType,
    FileShareNotificationVariantDistributionToRecipientComplete,
    FileShareNotificationVariantNewNoticeReceived,
    //FileShareNotificationVariantNewPublicFile,
    FileShareNotificationVariantPrivateCommitComplete,
    FileShareNotificationVariantPublicSharingComplete,
    FileShareNotificationVariantReceptionComplete, FileShareNotificationVariantReplyReceived
} from "./fileShare.perspective";
import {TaggingZvm} from "./tagging.zvm";
import {FILES_DEFAULT_ROLE_NAME} from "../bindings/files.types";




/**
 *
 */
export class FileShareDvm extends DnaViewModel {

    /** For commit & send follow-up */
    private _mustSendTo?: AgentPubKeyB64[];
    /** For publish / send follow-up */
    private _mustAddTags?;

    /** -- DnaViewModel Interface -- */

    static readonly DEFAULT_BASE_ROLE_NAME = FILES_DEFAULT_ROLE_NAME;
    static readonly ZVM_DEFS: ZvmDef[] = [
        FileShareZvm,
        TaggingZvm,
        [DeliveryZvm, "zDelivery"],
    ];

    readonly signalHandler?: AppSignalCb = this.mySignalHandler;


    /** QoL Helpers */
    get fileShareZvm(): FileShareZvm {return this.getZomeViewModel(FileShareZvm.DEFAULT_ZOME_NAME) as FileShareZvm}
    get deliveryZvm(): DeliveryZvm {return this.getZomeViewModel("zDelivery") as DeliveryZvm}

    get taggingZvm(): TaggingZvm {return this.getZomeViewModel("zTagging") as TaggingZvm}

    /** -- ViewModel Interface -- */

    private _perspective: FileShareDvmPerspective = {notificationLogs: []};


    /** */
    protected hasChanged(): boolean {
        return true;
        // //console.log("fileShareDvm.hasChanged()");
        // if (!this._previousPerspective) {
        //     return true;
        // }
        // const prev = this._previousPerspective as FileShareDvmPerspective;
        // if (Object.values(this._perspective.unrepliedOutbounds).length != Object.values(prev.unrepliedOutbounds).length) {
        //     return true;
        // }
        // if (Object.values(this._perspective.unrepliedInbounds).length != Object.values(prev.unrepliedInbounds).length) {
        //     return true;
        // }
        // // TODO implement faster deep compare
        // return JSON.stringify(this._perspective) == JSON.stringify(prev);
        // //return false;
    }


    /** */
    get perspective(): FileShareDvmPerspective { return this._perspective }


    /** */
    get dnaProperties(): DeliveryProperties {
        console.log('dnaProperties() dnaModifiers', this.cell.dnaModifiers);
        const properties = decode(this.cell.dnaModifiers.properties as Uint8Array) as DeliveryProperties;
        console.log('dnaProperties() properties', properties);
        return properties;
    }


    /** -- Methods -- */

    /** */
    mySignalHandler(signal: AppSignal): void {
        const now = Date.now();
        console.log("FileShareDvm received signal", now, signal);
        const deliverySignal = signal.payload as SignalProtocol;
        /** */
        if (SignalProtocolType.NewLocalManifest in deliverySignal) {
            const manifest = deliverySignal.NewLocalManifest[2];
            const manifestEh = encodeHashToBase64(deliverySignal.NewLocalManifest[0])
            /** Follow-up send if requested */
            if (this._mustSendTo && this._mustSendTo.length > 0) {
                const recipients = this._mustSendTo.map((agent) => (' ' + agent).slice(1)); // deep copy string for promise
                console.log("sendFile follow up", manifestEh, this._mustSendTo);
                this.fileShareZvm.sendFile(manifestEh, this._mustSendTo).then((distribAh) => {
                    /** Into Notification */
                    console.log("File delivery request sent", deliverySignal.NewLocalManifest, recipients, this._mustAddTags);
                    this._perspective.notificationLogs.push([now, FileShareNotificationType.DeliveryRequestSent, {distribAh, manifestEh, recipients}]);
                    if (this._mustAddTags && this._mustAddTags.isPrivate) {
                        /*await*/ this.taggingZvm.tagPrivateEntry(manifestEh, this._mustAddTags.tags, manifest.description.name);
                        this._mustAddTags = undefined;
                    }
                    this.notifySubscribers();
                });
                this._mustSendTo = undefined;
            }
            /** Add Public tags if any */
            if (this._mustAddTags) {
                if (this._mustAddTags.isPrivate) {
                    /*await*/ this.taggingZvm.tagPrivateEntry(manifestEh, this._mustAddTags.tags, manifest.description.name);
                } else {
                    /*await*/ this.taggingZvm.tagPublicEntry(manifestEh, this._mustAddTags.tags, manifest.description.name);
                }
                this._mustAddTags = undefined;
            }
            /** Done */
            this._perspective.uploadState = undefined;
            this.notifySubscribers();
        }
        if (SignalProtocolType.NewLocalChunk in deliverySignal) {
            console.log("signal NewLocalChunk", deliverySignal.NewLocalChunk);
            //this._perspective.notificationLogs.push([now, SignalProtocolType.NewChunk, deliverySignal]);
            const chunk = deliverySignal.NewLocalChunk[1];
            const manifestPair = this.deliveryZvm.perspective.localManifestByData[chunk.data_hash];
            if (!manifestPair) {
                /** We are the original creator of this file */
                this._perspective.uploadState.chunks.push(deliverySignal.NewLocalChunk[0]);
                const index = this._perspective.uploadState.chunks.length;
                /** Commit manifest if it was the last chunk */
                if (this._perspective.uploadState.chunks.length == this._perspective.uploadState.splitObj.numChunks) {
                    if (this._perspective.uploadState.isPrivate) {
                        this.fileShareZvm.commitPrivateManifest(this._perspective.uploadState.file, this._perspective.uploadState.splitObj.dataHash, this._perspective.uploadState.chunks)
                    } else {
                        this.fileShareZvm.publishFileManifest(this._perspective.uploadState.file, this._perspective.uploadState.splitObj.dataHash, this._perspective.uploadState.chunks);
                    }
                } else {
                    /** Otherwise commit next batch */
                    if (this._perspective.uploadState.chunks.length == this._perspective.uploadState.written_chunks) {
                        this.writeChunks();
                    }
                }
                this.notifySubscribers();
            }
        }
        if (SignalProtocolType.NewReceptionProof in deliverySignal) {
            console.log("signal NewReceptionProof", deliverySignal.NewReceptionProof);
            this.fileShareZvm.zomeProxy.getPrivateFiles().then(() => {
                /** Into Notification */
                const notif = {
                    noticeEh: encodeHashToBase64(deliverySignal.NewReceptionProof[2].notice_eh),
                    manifestEh: encodeHashToBase64(deliverySignal.NewReceptionProof[2].parcel_eh),
                } as FileShareNotificationVariantReceptionComplete;
                this._perspective.notificationLogs.push([now, FileShareNotificationType.ReceptionComplete, notif]);
                this.notifySubscribers();
            })
        }
        if (SignalProtocolType.NewPublicParcel in deliverySignal) {
            console.log("signal NewPublicParcel dvm", deliverySignal.NewPublicParcel);
            const author = encodeHashToBase64(deliverySignal.NewPublicParcel[2]);
            const pr = deliverySignal.NewPublicParcel[1];
            //const timestamp = deliverySignal.NewPublicParcel[0];
            const ppEh = encodeHashToBase64(pr.eh);
            if (author != this.cell.agentPubKey) {
                // FIXME: getManifest() fails because it gets received via gossip. Might be best to requestManifest instead?
                //this.deliveryZvm.zomeProxy.getManifest(decodeHashFromBase64(ppEh)).then((manifest) => this._perspective.publicFiles[manifest.data_hash] = ppEh);
                //this.probePublicFiles();
                //this._latestPublic.push(ppEh);
                /** Have DeliveryZvm perform probePublicParcels */
                this.probeAll();
            } else {
                /** Notify UI that we finished publishing something */
                const notif = {
                    manifestEh: ppEh,
                } as FileShareNotificationVariantPublicSharingComplete;
                this._perspective.notificationLogs.push([now, FileShareNotificationType.PublicSharingComplete, notif]);
                this._perspective.uploadState = undefined;

                this.notifySubscribers();

                /** Notify peers that we published something */
                //const peers = this._profilesZvm.getAgents().map((peer) => decodeHashFromBase64(peer));
                //this._dvm.deliveryZvm.zomeProxy.notifyNewPublicParcel({peers, timestamp, pr});
            }
        }
        if (SignalProtocolType.NewReplyAck in deliverySignal) {
            console.log("signal NewReplyAck", deliverySignal.NewReplyAck);
            /** Into Notification */
            const notif = {
                distribAh: encodeHashToBase64(deliverySignal.NewReplyAck[2].distribution_ah),
                recipient: encodeHashToBase64(deliverySignal.NewReplyAck[2].recipient),
                hasAccepted: deliverySignal.NewReplyAck[2].has_accepted,
            } as FileShareNotificationVariantReplyReceived;
            this._perspective.notificationLogs.push([now, FileShareNotificationType.ReplyReceived, notif]);
            this.notifySubscribers();
        }
        if (SignalProtocolType.NewNotice in deliverySignal) {
            console.log("signal NewNotice", deliverySignal.NewNotice);
            /** Into Notification */
            const notif = {
                noticeEh: encodeHashToBase64(deliverySignal.NewNotice[0]),
                manifestEh: encodeHashToBase64(deliverySignal.NewNotice[2].summary.parcel_reference.eh),
                description: deliverySignal.NewNotice[2].summary.parcel_reference.description,
                sender: encodeHashToBase64(deliverySignal.NewNotice[2].sender),
            } as FileShareNotificationVariantNewNoticeReceived;
            this._perspective.notificationLogs.push([now, FileShareNotificationType.NewNoticeReceived, notif]);
            this.notifySubscribers();
        }
        if (SignalProtocolType.NewReceptionAck in deliverySignal) {
            console.log("signal NewReceptionAck", deliverySignal.NewReceptionAck);
            /** Into Notification */
            const notif = {
                distribAh: encodeHashToBase64(deliverySignal.NewReceptionAck[2].distribution_ah),
                recipient: encodeHashToBase64(deliverySignal.NewReceptionAck[2].recipient),
            } as FileShareNotificationVariantDistributionToRecipientComplete;
            this._perspective.notificationLogs.push([now, FileShareNotificationType.DistributionToRecipientComplete, notif]);
            this.notifySubscribers();
        }
    }



    // /** */
    // shouldProbePublic(): boolean {
    //     return this._latestPublic.length > 0;
    // };


    // /** */
    // protected postProbeAll(): void {
    //     console.log("postProbeAll() PublicParcels START");
    //     this.updatePublicFiles();
    // }


    // /** */
    // private async updatePublicFiles(): Promise<Dictionary<string>> {
    //     let publicFiles: Dictionary<string> = {};
    //     const pds = Object.entries(this.deliveryZvm.perspective.publicParcels);
    //     console.log("probeAllInner() PublicParcels count", Object.entries(pds).length);
    //     for (const [ppEh, [pd, _ts, _author]] of pds) {
    //         if (pd.zome_origin == "file_share_integrity") {
    //             try {
    //                 const manifest = await this.deliveryZvm.zomeProxy.getManifest(decodeHashFromBase64(ppEh));
    //                 publicFiles[manifest.data_hash] = ppEh;
    //                 if (this._latestPublic.includes(ppEh)) {
    //                     this._latestPublic = this._latestPublic.filter(item => item != ppEh);
    //                 }
    //             } catch(e) {
    //                 console.warn("getManifest() failed. Probably did need to wait for gossip");
    //             }
    //         }
    //     }
    //     this._perspective.publicFiles = publicFiles;
    //     this.notifySubscribers();
    //     return publicFiles;
    // }



    /** Return list of ParcelEh that holds a file with a name that matches filter */
    searchParcel(filter: string): EntryHashB64[] {
        if (filter.length < 2) {
            return [];
        }
        const pps = Object.entries(this.deliveryZvm.perspective.publicParcels)
            .filter(([_ppEh, [description, _ts, _agent]]) => description.name.toLowerCase().includes(filter))
            .map(([ppEh, _tuple]) => ppEh);


        const pms = Object.entries(this.deliveryZvm.perspective.privateManifests)
            .filter(([ppEh, [manifest, _ts]]) => manifest.description.name.toLowerCase().includes(filter))
            .map(([ppEh, _tuple]) => ppEh);

        return pps.concat(pms);
    }


    /** Can't send to self */
    async startCommitPrivateAndSendFile(file: File, recipients: AgentPubKeyB64[], tags: string[]): Promise<SplitObject | undefined> {
        const mustSentTo = recipients
            .filter((agent) => agent != this.cell.agentPubKey);
        console.log("startCommitPrivateAndSendFile()", recipients, mustSentTo);
        if (mustSentTo.length == 0) {
            return undefined;
        }
        this._mustSendTo = mustSentTo;
        return this.startCommitPrivateFile(file, tags);
    }


    /** */
    async startCommitPrivateFile(file: File, tags: string[]): Promise<SplitObject> {
        console.log('dvm.startCommitPrivateFile: ', file, tags);
        if (this._perspective.uploadState) {
            return Promise.reject("File commit already in progress");
        }
        const splitObj = await splitFile(file, this.dnaProperties.maxChunkSize);
        /** Check if file already present */
        if (this.deliveryZvm.perspective.localManifestByData[splitObj.dataHash]) {
            console.warn("File already stored locally");
            //return this.deliveryZvm.perspective.localManifestByData[splitObj.dataHash];
            return;
        }
        this._perspective.uploadState = {
            splitObj,
            file,
            isPrivate: true,
            chunks: [],
            index: 0,
            written_chunks: 0,
        };
        this.notifySubscribers();

        /** Initial write chunk loop */
        /* await */ this.writeChunks();
        this._mustAddTags = {isPrivate: true, tags};

        /* Done */
        return splitObj;
    }


    /** */
    async startPublishFile(file: File, tags: string[]): Promise<SplitObject> {
        console.log('dvm.startPublishFile: ', file, tags);
        if (this._perspective.uploadState) {
            return Promise.reject("File commit already in progress");
        }
        const splitObj = await splitFile(file, this.dnaProperties.maxChunkSize);
        /** Check if file already present */
        if (this.deliveryZvm.perspective.localManifestByData[splitObj.dataHash]) {
            console.warn("File already stored locally");
            return;
        }
        this._perspective.uploadState = {
            splitObj,
            file,
            isPrivate: false,
            chunks: [],
            index: 0,
            written_chunks: 0
        };
        this.notifySubscribers();

        /** Initial write chunk loop */
        /*await */ this.writeChunks();
        // this.fileShareZvm.zomeProxy.writePublicFileChunks([{data_hash: splitObj.dataHash, data: splitObj.chunks[0]}]);
        this._mustAddTags = {isPrivate: false, tags};
        /** Done */
        return splitObj;
    }


    /** */
    async writeChunks(): Promise<void> {
        const MAX_WEBSOCKET_PAYLOAD = 8 * 1024 * 1024;
        const num_chunks = Math.floor(MAX_WEBSOCKET_PAYLOAD / this.dnaProperties.maxChunkSize);
        const splitObj = this._perspective.uploadState.splitObj;
        const index = this._perspective.uploadState.index;
        /** Form chunks from splitObj */
        const chunks = [];
        for (let i = index; i < index + num_chunks && i < splitObj.numChunks; i += 1) {
            chunks.push({data_hash: splitObj.dataHash, data: splitObj.chunks[i]} as ParcelChunk)
        }
        this._perspective.uploadState.written_chunks += chunks.length;
        this._perspective.uploadState.index += chunks.length;
        console.log("writeChunks()", chunks.length, this._perspective.uploadState.written_chunks)
        /** Write */
        if (this._perspective.uploadState.isPrivate) {
            await this.fileShareZvm.zomeProxy.writePrivateFileChunks(chunks);
        } else {
            await this.fileShareZvm.zomeProxy.writePublicFileChunks(chunks);
        }
    }


    /** */
    async resumeInbounds() {
        const inbounds = this.deliveryZvm.inbounds();
        for (const [_notice_eh, [notice, _ts, pct]] of Object.entries(inbounds)) {
            await this.deliveryZvm.zomeProxy.requestMissingChunks(notice.summary.parcel_reference.eh);
        }
    }



    // /** */
    // async publishFile(file: File): Promise<EntryHashB64> {
    //     console.log('dvm.commitPublicFile: ', file);
    //     const splitObj = await splitFile(file, this.dnaProperties.maxChunkSize);
    //     /** Check if file already present */
    //     if (this.deliveryZvm.perspective.localManifestByData[splitObj.dataHash]) {
    //         console.warn("File already stored locally");
    //         return this.deliveryZvm.perspective.localManifestByData[splitObj.dataHash];
    //     }
    //     const ehb64 = await this.fileShareZvm.publishFile(file, splitObj);
    //     return ehb64;
    // }


    /** */
    async getLocalFile(ppEh: EntryHashB64): Promise<[ParcelManifest, string]> {
        const manifest = await this.deliveryZvm.zomeProxy.getManifest(decodeHashFromBase64(ppEh));
        this.deliveryZvm.perspective.chunkCounts[manifest.data_hash] = 0;
        const dataB64 = await this.deliveryZvm.getParcelData(ppEh);
        return [manifest, dataB64];
    }


    /** */
    async localParcel2File(manifestEh: EntryHashB64): Promise<File> {
        /** Get File on source chain */
        const [manifest, data] = await this.getLocalFile(manifestEh);

        /** DEBUG - check if content is valid base64 */
            // if (!base64regex.test(data)) {
            //   const invalid_hash = sha256(data);
            //   console.error("File '" + manifest.filename + "' is invalid base64. hash is: " + invalid_hash);
            // }

        let filetype = (manifest.description.kind_info as ParcelKindVariantManifest).Manifest;
        console.log("downloadFile()", filetype);
        const fields = filetype.split(':');
        if (fields.length > 1) {
            const types = fields[1].split(';');
            filetype = types[0];
        }
        const byteArray = base64ToArrayBuffer(data)
        const blob = new Blob([byteArray], { type: filetype});
        const file = new File([blob], manifest.description.name);
        return file;
    }
}
