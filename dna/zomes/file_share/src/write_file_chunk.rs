use hdk::prelude::*;
use zome_utils::*;

use zome_delivery_types::*;
use zome_delivery_api::*;


/// Wrapper for commit_parcel_chunk()
#[hdk_extern]
pub fn write_private_file_chunk(chunk: ParcelChunk) -> ExternResult<EntryHash> {
    debug!(" write_file_chunk() size: {}", chunk.data.len());
    std::panic::set_hook(Box::new(zome_panic_hook));
    let response = call_delivery_zome("commit_parcel_chunk", chunk)?;
    let eh: EntryHash = decode_response(response)?;
    Ok(eh)
}


/// Wrapper for publish_chunk()
#[hdk_extern]
pub fn write_public_file_chunk(chunk: ParcelChunk) -> ExternResult<EntryHash> {
    debug!(" write_public_file_chunk() size: {}", chunk.data.len());
    std::panic::set_hook(Box::new(zome_panic_hook));
    let response = call_delivery_zome("publish_chunk", chunk)?;
    let eh: EntryHash = decode_response(response)?;
    Ok(eh)
}
