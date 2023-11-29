import {HvmDef} from "@ddd-qc/lit-happ";
import {FilesDvm} from "@ddd-qc/files";

export const DEFAULT_FILES_DEF: HvmDef = {
  id: "Files",
  dvmDefs: [{ctor: FilesDvm, isClonable: false}],
}

