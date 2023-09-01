/* This file is generated by zits. Do not edit manually */

import {ZomeName, FunctionName} from '@holochain/client';


/** Array of all zome function names in "fileShare" */
export const fileShareFunctionNames: FunctionName[] = [
	"entry_defs", 
	"get_zome_info", 
	"get_dna_info",

	"write_chunk",
	"commit_file_manifest",
	"get_file",
	"get_files_from",
	"refuse_file_share",
	"accept_file_share",
	"get_local_files",
	"get_unreplied_notices",
	"process_inbox",
	"send_file",];


/** Generate tuple array of function names with given zomeName */
export function generateFileShareZomeFunctionsArray(zomeName: ZomeName): [ZomeName, FunctionName][] {
   const fns: [ZomeName, FunctionName][] = [];
   for (const fn of fileShareFunctionNames) {
      fns.push([zomeName, fn]);
   }
   return fns;
}


/** Tuple array of all zome function names with default zome name "zFileShare" */
export const fileShareZomeFunctions: [ZomeName, FunctionName][] = generateFileShareZomeFunctionsArray("zFileShare");
