import {HvmDef} from "@ddd-qc/lit-happ";
import {ProfilesDvm} from "@ddd-qc/profiles-dvm";
import {FilesDvm} from "@ddd-qc/files";

export const DEFAULT_FILES_WE_DEF: HvmDef = {
  id: "FilesWeApplet",
  dvmDefs: [{ctor: FilesDvm, isClonable: false}],
}

export const DEFAULT_FILES_DEF: HvmDef = {
  id: "Files",
  dvmDefs: [{ctor: FilesDvm, isClonable: false}, {ctor: ProfilesDvm, isClonable: false}],
}
