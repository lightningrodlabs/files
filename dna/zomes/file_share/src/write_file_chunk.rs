use hdk::prelude::*;
use zome_utils::*;

use zome_delivery_types::*;
use zome_delivery_api::*;


/// Wrapper for commit_parcel_chunks()
#[hdk_extern]
pub fn write_private_file_chunks(chunks: Vec<ParcelChunk>) -> ExternResult<Vec<EntryHash>> {
    //debug!(" write_file_chunk() size: {}", chunks.len());
    std::panic::set_hook(Box::new(zome_panic_hook));
    let response = call_delivery_zome("commit_private_chunks", chunks)?;
    let ehs: Vec<EntryHash> = decode_response(response)?;
    Ok(ehs)
}


/// Wrapper for publish_chunks()
#[hdk_extern]
pub fn write_public_file_chunks(chunks: Vec<ParcelChunk>) -> ExternResult<Vec<EntryHash>> {
    //debug!(" write_public_file_chunk() size: {}", chunks.len());
    std::panic::set_hook(Box::new(zome_panic_hook));
    let response = call_delivery_zome("publish_chunks", chunks)?;
    let ehs: Vec<EntryHash> = decode_response(response)?;
    Ok(ehs)
}
