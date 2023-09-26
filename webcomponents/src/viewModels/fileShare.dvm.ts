import { DnaViewModel, ZvmDef } from "@ddd-qc/lit-happ";
import {
    DeliveryProperties,
    DeliveryZvm, ParcelDescription,
    ParcelManifest,
    SignalProtocol,
    SignalProtocolType
} from "@ddd-qc/delivery";
import {
    ActionHashB64,
    AgentPubKeyB64,
    AppSignalCb,
    decodeHashFromBase64, encodeHashToBase64,
    EntryHash,
    EntryHashB64, Timestamp,
} from "@holochain/client";
import {AppSignal} from "@holochain/client/lib/api/app/types";

import {FileShareZvm} from "./fileShare.zvm";
import {splitFile, SplitObject} from "../utils";
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

    private _perspective: FileShareDvmPerspective = {publicFiles: {}, notificationLogs: []};


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
                        this.fileShareZvm.publishFileManifest(this._uploadState.file, this._uploadState.splitObj.dataHash, this._uploadState.chunks).then((eh) => {
                            /** Into Notification */
                            const notif = {
                                manifestEh: eh,
                            } as FileShareNotificationVariantPublicSharingComplete;
                            this._perspective.notificationLogs.push([now, FileShareNotificationType.PublicSharingComplete, notif]);
                            this.notifySubscribers();
                            this._uploadState = undefined;
                        });
                    }
                } else {
                    /** Otherwise commit next one */
                    this.fileShareZvm.zomeProxy.writePrivateFileChunk({data_hash: this._uploadState.splitObj.dataHash, data: this._uploadState.splitObj.chunks[index]});
                }
            }
        }
        if (SignalProtocolType.NewReceptionProof in deliverySignal) {
            console.log("signal NewReceptionProof", deliverySignal.NewReceptionProof);
            this.fileShareZvm.getPrivateFiles().then(() => {
                /** Into Notification */
                const notif = {
                    noticeEh: encodeHashToBase64(deliverySignal.NewReceptionProof[1].notice_eh),
                    manifestEh: encodeHashToBase64(deliverySignal.NewReceptionProof[1].parcel_eh),
                } as FileShareNotificationVariantReceptionComplete;
                this._perspective.notificationLogs.push([now, FileShareNotificationType.ReceptionComplete, notif]);
                this.notifySubscribers();
            })
        }
        if (SignalProtocolType.NewPublicParcel in deliverySignal) {
            console.log("signal NewPublicParcel", deliverySignal.NewPublicParcel);
            /** Into Notification */
            // const notif = {
            //     manifestEh: encodeHashToBase64(deliverySignal.NewPublicParcel.eh),
            //     description: deliverySignal.NewPublicParcel.description,
            // } as FileShareNotificationVariantNewPublicFile;
            // this._perspective.notificationLogs.push([now, FileShareNotificationType.NewPublicFile, notif]);

            // const ppEh = encodeHashToBase64(deliverySignal.NewPublicParcel.eh);
            // this.deliveryZvm.zomeProxy.getManifest(decodeHashFromBase64(ppEh)).then((manifest: ParcelManifest) => {
            //     this._perspective.publicFiles[manifest.data_hash] = ppEh;
            //     this.notifySubscribers();
            // })
            this.notifySubscribers();
        }
        if (SignalProtocolType.NewReplyAck in deliverySignal) {
            console.log("signal NewReplyAck", deliverySignal.NewReplyAck);
            /** Into Notification */
            const notif = {
                distribAh: encodeHashToBase64(deliverySignal.NewReplyAck[1].distribution_ah),
                recipient: encodeHashToBase64(deliverySignal.NewReplyAck[1].recipient),
                hasAccepted: deliverySignal.NewReplyAck[1].has_accepted,
            } as FileShareNotificationVariantReplyReceived;
            this._perspective.notificationLogs.push([now, FileShareNotificationType.ReplyReceived, notif]);
            this.notifySubscribers();
        }
        if (SignalProtocolType.NewNotice in deliverySignal) {
            console.log("signal NewNotice", deliverySignal.NewNotice);
            /** Into Notification */
            const notif = {
                noticeEh: encodeHashToBase64(deliverySignal.NewNotice[0]),
                manifestEh: encodeHashToBase64(deliverySignal.NewNotice[1].summary.parcel_reference.eh),
                description: deliverySignal.NewNotice[1].summary.parcel_reference.description,
                sender: encodeHashToBase64(deliverySignal.NewNotice[1].sender),
            } as FileShareNotificationVariantNewNoticeReceived;
            this._perspective.notificationLogs.push([now, FileShareNotificationType.NewNoticeReceived, notif]);
            this.notifySubscribers();
        }
        if (SignalProtocolType.NewReceptionAck in deliverySignal) {
            console.log("signal NewReceptionAck", deliverySignal.NewReceptionAck);
            /** Into Notification */
            const notif = {
                distribAh: encodeHashToBase64(deliverySignal.NewReceptionAck[1].distribution_ah),
                recipient: encodeHashToBase64(deliverySignal.NewReceptionAck[1].recipient),
            } as FileShareNotificationVariantDistributionToRecipientComplete;
            this._perspective.notificationLogs.push([now, FileShareNotificationType.DistributionToRecipientComplete, notif]);
            this.notifySubscribers();
        }
    }


    /** */
    async probePublicFiles(): Promise<Dictionary<string>> {
        let publicFiles: Dictionary<string> = {};
        const pds = Object.entries(this.deliveryZvm.perspective.publicParcels);
        console.log("probePublicFiles() PublicParcels count", Object.entries(pds).length);
        for (const [ppEh, pd] of pds) {
            if (pd.zome_origin == "file_share_integrity") {
                const manifest = await this.deliveryZvm.zomeProxy.getManifest(decodeHashFromBase64(ppEh));
                publicFiles[manifest.data_hash] = ppEh;
            }
        }
        this._perspective.publicFiles = publicFiles;
        this.notifySubscribers();
        return publicFiles;
    }

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


}
