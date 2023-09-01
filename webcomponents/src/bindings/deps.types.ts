/** From Delivery Zome */
import {EntryHash} from "@holochain/client";


export const CHUNK_MAX_SIZE = 200 * 1024;

export const PARCEL_MAX_SIZE = 10 * 1024 * 1024;


export type DistributionStrategy =
    | {NORMAL: null} | {DM_ONLY: null} | {DHT_ONLY: null};
export enum DistributionStrategyType {
  Normal = 'Normal',
  DmOnly = 'DmOnly',
  DhtOnly = 'DhtOnly',
}


/** WARN : Change MANIFEST_ENTRY_NAME const when renaming */
export interface ParcelManifest {
  name: string
  custum_entry_type: string
  size: number
  chunks: EntryHash[]
}
