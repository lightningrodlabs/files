/* This file is generated by zits. Do not edit manually */

import {ZomeName, FunctionName} from '@holochain/client';


/** Array of all zome function names in "files" */
export const filesFunctionNames: FunctionName[] = [
	"entry_defs", 
	"get_zome_info", 
	"get_dna_info",
	"attach_to_hrl",
	"get_files_from_hrl",

	"commit_private_file",
	"get_ah",
	"get_file_info",
	"get_private_files",
	"get_local_public_files",
	"get_private_files_from",
	"get_unreplied_notices",
	"probe_public_files",
	"process_inbox",
	"publish_file_manifest",
	"refuse_file_share",
	"accept_file_share",
	"send_file",
	"write_private_file_chunks",
	"write_public_file_chunks",];


/** Generate tuple array of function names with given zomeName */
export function generateFilesZomeFunctionsArray(zomeName: ZomeName): [ZomeName, FunctionName][] {
   const fns: [ZomeName, FunctionName][] = [];
   for (const fn of filesFunctionNames) {
      fns.push([zomeName, fn]);
   }
   return fns;
}


/** Tuple array of all zome function names with default zome name "zFiles" */
export const filesZomeFunctions: [ZomeName, FunctionName][] = generateFilesZomeFunctionsArray("zFiles");
