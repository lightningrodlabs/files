import {HvmDef} from "@ddd-qc/lit-happ";
import {Context, createContext} from "@lit-labs/context";
import {ProfilesZvm} from "./profiles.zvm";
import {FileShareDvm} from "./fileShare.dvm";
import {ProfilesDvm} from "./profiles.dvm";


export const DEFAULT_FILESHARE_DEF: HvmDef = {
  id: "FileShare",
  dvmDefs: [{ctor: FileShareDvm, isClonable: false}],
}

export const DEFAULT_FILESHAREDEV_DEF: HvmDef = {
  id: "FileShareDev",
  dvmDefs: [{ctor: FileShareDvm, isClonable: false}, {ctor: ProfilesDvm, isClonable: false}],
}

export const globalProfilesContext = createContext<ProfilesZvm>('global/profiles');
