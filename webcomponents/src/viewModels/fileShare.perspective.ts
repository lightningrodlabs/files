import {ActionHashB64, AgentPubKeyB64, Entry, EntryHash, EntryHashB64, Timestamp} from "@holochain/client";
import {ParcelDescription, SignalProtocol, SignalProtocolType} from "@ddd-qc/delivery";
import {SplitObject} from "../utils";


/** */
interface UploadState {
    isPrivate: boolean,
    file: File,
    splitObj: SplitObject,
    chunks: EntryHash[],
}


/** */
export interface FileShareDvmPerspective {
    uploadState?: UploadState;
    /** Notifications */
    notificationLogs: [Timestamp, FileShareNotificationType, FileShareNotification][];
}


/** */
export enum FileShareNotificationType {
    //NewPublicFile = 'NewPublicFile',
    DeliveryRequestSent = 'DeliveryRequestSent',
    ReceptionComplete = 'ReceptionComplete',
    DistributionToRecipientComplete = 'DistributionToRecipientComplete',
    PublicSharingComplete = 'PublicSharingComplete',
    PrivateCommitComplete = 'PrivateCommitComplete',
    NewNoticeReceived = 'NewNoticeReceived',
    ReplyReceived = 'ReplyReceived',
}

//export type FileShareNotificationVariantNewPublicFile = { manifestEh: EntryHashB64, description: ParcelDescription }
export type FileShareNotificationVariantDeliveryRequestSent = {distribAh: ActionHashB64, manifestEh: EntryHashB64, recipient: AgentPubKeyB64 }
export type FileShareNotificationVariantReceptionComplete = {noticeEh: EntryHashB64, manifestEh: EntryHashB64 }
export type FileShareNotificationVariantDistributionToRecipientComplete = {distribAh: ActionHashB64, recipient: AgentPubKeyB64 }
export type FileShareNotificationVariantPublicSharingComplete = {manifestEh: EntryHashB64 }
export type FileShareNotificationVariantPrivateCommitComplete = {manifestEh: EntryHashB64 }
export type FileShareNotificationVariantNewNoticeReceived = {noticeEh: EntryHashB64, manifestEh: EntryHashB64, description: ParcelDescription, sender: AgentPubKeyB64 }
export type FileShareNotificationVariantReplyReceived = {distribAh: ActionHashB64, recipient: AgentPubKeyB64, hasAccepted: boolean }

/** */
export type FileShareNotification =
    //| FileShareNotificationVariantNewPublicFile
    | FileShareNotificationVariantReceptionComplete
    | FileShareNotificationVariantDistributionToRecipientComplete
    | FileShareNotificationVariantPublicSharingComplete
    | FileShareNotificationVariantPrivateCommitComplete
    | FileShareNotificationVariantNewNoticeReceived
    | FileShareNotificationVariantReplyReceived

