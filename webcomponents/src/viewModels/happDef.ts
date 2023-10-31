import {HvmDef} from "@ddd-qc/lit-happ";
import {Context, createContext} from "@lit-labs/context";
import {FileShareDvm} from "./fileShare.dvm";
import {ProfilesDvm, ProfilesZvm} from "@ddd-qc/profiles-dvm";

///** DNA PROPERTIES (must be set to this in dna.yaml */
// export const maxChunkSize = 204800;
// export const maxParcelSize = 104857600;
// export const maxParcelNameLength = 256;
// export const minParcelNameLength = 1;


export const DEFAULT_FILESHARE_DEF: HvmDef = {
  id: "FileShare",
  dvmDefs: [{ctor: FileShareDvm, isClonable: false}],
}

export const DEFAULT_FILESHAREDEV_DEF: HvmDef = {
  id: "FileShareDev",
  dvmDefs: [{ctor: FileShareDvm, isClonable: false}, {ctor: ProfilesDvm, isClonable: false}],
}

export const globalProfilesContext = createContext<ProfilesZvm>('global/profiles');
