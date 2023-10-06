import {AppProxy, delay, DnaViewModel, HCL, ZvmDef} from "@ddd-qc/lit-happ";
import {
    DeliveryProperties,
    DeliveryZvm, ParcelDescription, ParcelKindVariantManifest,
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
    EntryHashB64, InstalledAppId, Timestamp,
} from "@holochain/client";
import {AppSignal} from "@holochain/client/lib/api/app/types";

import {FileShareZvm} from "./fileShare.zvm";
import {base64ToArrayBuffer, splitFile, SplitObject} from "../utils";
import { decode } from "@msgpack/msgpack";
import {Dictionary} from "@ddd-qc/cell-proxy";
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
import {ReactiveElement} from "lit";


/** */
interface UploadState {
    isPrivate: boolean,
    file: File,
    splitObj: SplitObject,
    chunks: EntryHash[],
}


/**
 *
 */
export class FileShareDvm extends DnaViewModel {

    private _uploadState?: UploadState;

    //private _latestPublic: EntryHashB64[] = [];

    /** -- DnaViewModel Interface -- */

    static readonly DEFAULT_BASE_ROLE_NAME = "rFileShare";
    static readonly ZVM_DEFS: ZvmDef[] = [
        FileShareZvm,
        [DeliveryZvm, "zDelivery"],
    ];

    readonly signalHandler?: AppSignalCb = this.mySignalHandler;


    /** QoL Helpers */
    get fileShareZvm(): FileShareZvm {return this.getZomeViewModel(FileShareZvm.DEFAULT_ZOME_NAME) as FileShareZvm}
    get deliveryZvm(): DeliveryZvm {return this.getZomeViewModel("zDelivery") as DeliveryZvm}


    /** -- ViewModel Interface -- */

    private _perspective: FileShareDvmPerspective = {/*publicFiles: {},*/ notificationLogs: []};


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
    //get perspective(): unknown { return {} }


    get dnaProperties(): DeliveryProperties {
        const properties = decode(this.cell.dnaModifiers.properties as Uint8Array) as DeliveryProperties;
        //console.log('properties', properties);
        return properties;
    }


    /** -- Methods -- */

    /** */
    mySignalHandler(signal: AppSignal): void {
        const now = Date.now();
        console.log("FileShareDvm received signal", now, signal);
        const deliverySignal = signal.payload as SignalProtocol;
        if (SignalProtocolType.NewChunk in deliverySignal) {
            console.log("signal NewChunk", deliverySignal.NewChunk);
            //this._perspective.notificationLogs.push([now, SignalProtocolType.NewChunk, deliverySignal]);
            const chunk = deliverySignal.NewChunk[1];
            const manifestPair = this.deliveryZvm.perspective.localManifestByData[chunk.data_hash];
            if (!manifestPair) {
                /** We are the original creator of this file */
                this._uploadState.chunks.push(deliverySignal.NewChunk[0]);
                const index = this._uploadState.chunks.length;
                /** Commit manifest if it was the last chunk */
                if (this._uploadState.chunks.length == this._uploadState.splitObj.numChunks) {
                    if (this._uploadState.isPrivate) {
                        this.fileShareZvm.commitPrivateManifest(this._uploadState.file, this._uploadState.splitObj.dataHash, this._uploadState.chunks).then((eh) => {
                            /** Into Notification */
                            const notif = {
                                manifestEh: eh,
                            } as FileShareNotificationVariantPrivateCommitComplete;
                            this._perspective.notificationLogs.push([now, FileShareNotificationType.PrivateCommitComplete, notif]);
                            this.notifySubscribers();
                            this._uploadState = undefined;
                        });
                    } else {
                        this.fileShareZvm.publishFileManifest(this._uploadState.file, this._uploadState.splitObj.dataHash, this._uploadState.chunks);
                    }
                } else {
                    /** Otherwise commit next one */
                    this.fileShareZvm.zomeProxy.writePrivateFileChunk({data_hash: this._uploadState.splitObj.dataHash, data: this._uploadState.splitObj.chunks[index]});
                }
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
                this.probeAll();
            } else {
                /** Notify UI that we finished publishing something */
                const notif = {
                    manifestEh: ppEh,
                } as FileShareNotificationVariantPublicSharingComplete;
                this._perspective.notificationLogs.push([now, FileShareNotificationType.PublicSharingComplete, notif]);
                this.notifySubscribers();
                this._uploadState = undefined;

                /** Notify peers that we published something */
                //const peers = this._profilesZvm.getAgents().map((peer) => decodeHashFromBase64(peer));
                //this._dvm.deliveryZvm.zomeProxy.notifyNewPublicParcel({peers, timestamp, pr});
            }
            this.notifySubscribers();
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


    /** */
    async startCommitPrivateFile(file: File): Promise<SplitObject> {
        console.log('dvm.commitPrivateFile: ', file);
        if (this._uploadState) {
            return Promise.reject("File commit already in progress");
        }
        const splitObj = await splitFile(file, this.dnaProperties.maxChunkSize);
        /** Check if file already present */
        if (this.deliveryZvm.perspective.localManifestByData[splitObj.dataHash]) {
            console.warn("File already stored locally");
            //return this.deliveryZvm.perspective.localManifestByData[splitObj.dataHash];
            return;
        }
        this._uploadState = {
            splitObj,
            file,
            isPrivate: true,
            chunks: [],
        };
        //this.deliveryZvm.perspective.chunkCounts[splitObj.dataHash] = 0;
        /** Initial write chunk loop */
        this.fileShareZvm.zomeProxy.writePrivateFileChunk({data_hash: splitObj.dataHash, data: splitObj.chunks[0]});
        ///*const ehb64 =*/ await this.fileShareZvm.commitPrivateFile(file, splitObj);
        //return ehb64;
        return splitObj;
    }


    /** */
    async startPublishFile(file: File): Promise<SplitObject> {
        console.log('dvm.commitPublicFile: ', file);
        if (this._uploadState) {
            return Promise.reject("File commit already in progress");
        }
        const splitObj = await splitFile(file, this.dnaProperties.maxChunkSize);
        /** Check if file already present */
        if (this.deliveryZvm.perspective.localManifestByData[splitObj.dataHash]) {
            console.warn("File already stored locally");
            return;
        }
        this._uploadState = {
            splitObj,
            file,
            isPrivate: false,
            chunks: [],
        };
        //this.deliveryZvm.perspective.chunkCounts[splitObj.dataHash] = 0;
        /** Initial write chunk loop */
        this.fileShareZvm.zomeProxy.writePrivateFileChunk({data_hash: splitObj.dataHash, data: splitObj.chunks[0]});
        ///*const ehb64 =*/ await this.fileShareZvm.commitPrivateFile(file, splitObj);
        //return ehb64;
        return splitObj;
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
