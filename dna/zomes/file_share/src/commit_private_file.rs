use hdk::prelude::*;
use zome_utils::*;

use zome_delivery_types::*;
use zome_delivery_api::*;
use zome_file_share_integrity::*;



#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct WriteManifestInput {
    pub filename: String,
    pub filetype: String,
    pub data_hash: String,
    pub orig_filesize: u64,
    pub chunks: Vec<EntryHash>,
}


/// Helper for commit_parcel_manifest()
#[hdk_extern]
pub fn commit_private_file(input: WriteManifestInput) -> ExternResult<(EntryHash, ParcelDescription)> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    /// Form Description
    let description = ParcelDescription {
        name: input.filename,
        size: input.orig_filesize,
        zome_origin: FILE_SHARE_ZOME_NAME.into(),
        visibility: EntryVisibility::Private,
        kind_info: ParcelKind::Manifest(format!("{}::{}", FILE_TYPE_NAME, input.filetype)),
    };
    /// Commit Manifest
    let manifest = ParcelManifest {
        data_hash: input.data_hash,
        chunks: input.chunks,
        description: description.clone(),
    };
    let response = call_delivery_zome("commit_parcel_manifest", manifest)?;
    let eh: EntryHash = decode_response(response)?;
    /// Done
    return Ok((eh, description));
}
