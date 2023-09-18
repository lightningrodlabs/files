#![allow(non_upper_case_globals)]
#![allow(unused_doc_comments)]
#![allow(non_camel_case_types)]
#![allow(non_snake_case)]
#![allow(unused_attributes)]


mod callbacks;
mod commit_private_file;
mod get_files;
mod get_file;
mod process_inbox;
mod send_file;
mod get_unreplied_notices;
mod publish_file_manifest;
mod utils;
mod probe_files;


// /// Zome Function
// #[hdk_extern]
// pub fn pull_inbox(_: ()) -> ExternResult<()> {
//    let response = call_delivery_zome("pull_inbox", ())?;
//    let _: Vec<ActionHash> = decode_response(response)?;
//    Ok(())
// }
