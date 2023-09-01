
/** From Delivery Zome */

export const CHUNK_MAX_SIZE = 200 * 1024;

export const PARCEL_MAX_SIZE = 10 * 1024 * 1024;


export type DistributionStrategy =
    | {NORMAL: null} | {DM_ONLY: null} | {DHT_ONLY: null};
export enum DistributionStrategyType {
  Normal = 'Normal',
  DmOnly = 'DmOnly',
  DhtOnly = 'DhtOnly',
}
