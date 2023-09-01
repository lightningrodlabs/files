import {HvmDef} from "@ddd-qc/lit-happ";
import {Context, createContext} from "@lit-labs/context";
import {ProfilesZvm} from "./profiles.zvm";
import {FileShareDvm} from "./fileShare.dvm";


export const DEFAULT_FILESHARE_DEF: HvmDef = {
  id: "fileShare",
  dvmDefs: [{ctor: FileShareDvm, isClonable: false}],
}

export const globalProfilesContext = createContext<ProfilesZvm>('global/profiles');
