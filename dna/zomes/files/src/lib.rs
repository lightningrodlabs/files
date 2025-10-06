mod attach_to_hrl;
mod callbacks;
mod commit_private_file;
mod get_any_record;
mod get_file_info;
mod get_files;
mod get_private_files_from;
mod get_unreplied_notices;
mod probe_public_files;
mod process_inbox;
mod publish_file_manifest;
mod respond_to_file_notice;
mod send_file;
mod utils;
mod write_file_chunk;

///-------------------------------------------------------------------------------------------------
use hdk::prelude::*;

#[hdk_extern]
fn get_zome_info(_: ()) -> ExternResult<ZomeInfo> {
   return zome_info();
}

#[hdk_extern]
fn get_dna_info(_: ()) -> ExternResult<DnaInfo> {
   return dna_info();
}

#[hdk_extern]
fn get_record_author(dh: AnyDhtHash) -> ExternResult<AgentPubKey> {
   return zome_utils::get_author(dh);
}
