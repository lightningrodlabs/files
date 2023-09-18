use hdk::prelude::*;
use zome_utils::*;

use zome_delivery_types::*;
use zome_delivery_api::*;
use zome_file_share_integrity::FILE_TYPE_NAME;
use crate::commit_private_file::WriteManifestInput;


/// Write data to source chain as a base64 string
#[hdk_extern]
pub fn write_public_chunk(data: String) -> ExternResult<EntryHash> {
    debug!(" write_public_chunk() size: {}", data.len());
    std::panic::set_hook(Box::new(zome_panic_hook));
    let response = call_delivery_zome("publish_chunk", data)?;
    let eh: EntryHash = decode_response(response)?;
    Ok(eh)
}


///
#[hdk_extern]
pub fn publish_file_manifest(input: WriteManifestInput) -> ExternResult<(EntryHash, ParcelDescription)> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    let description = ParcelDescription {
        name: input.filename,
        size: input.orig_filesize,
        zome_origin: "file_share_integrity".into(),
        visibility: EntryVisibility::Public,
        kind_info: ParcelKind::Manifest(format!("{}::{}", FILE_TYPE_NAME, input.filetype)),
    };
    /// Commit Manifest
    let manifest = ParcelManifest {
        data_hash: input.data_hash,
        chunks: input.chunks,
        description: description.clone(),
    };
    let response = call_delivery_zome("publish_manifest", manifest)?;
    let eh: EntryHash = decode_response(response)?;
    /// Done
    return Ok((eh, description));
}
