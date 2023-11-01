import {HvmDef} from "@ddd-qc/lit-happ";
import {createContext} from "@lit-labs/context";
import {FilesDvm} from "./files.dvm";
import {ProfilesDvm, ProfilesZvm} from "@ddd-qc/profiles-dvm";


export const DEFAULT_FILES_WE_DEF: HvmDef = {
  id: "FilesWeApplet",
  dvmDefs: [{ctor: FilesDvm, isClonable: false}],
}

export const DEFAULT_FILES_DEF: HvmDef = {
  id: "Files",
  dvmDefs: [{ctor: FilesDvm, isClonable: false}, {ctor: ProfilesDvm, isClonable: false}],
}

export const globalProfilesContext = createContext<ProfilesZvm>('global/profiles');
