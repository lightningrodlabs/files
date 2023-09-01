use hdk::prelude::*;
use zome_utils::*;

use zome_delivery_types::*;
use zome_delivery_api::*;
//use zome_file_share_integrity::*;


/// Write data to source chain as a base64 string
#[hdk_extern]
pub fn write_chunk(data: String) -> ExternResult<EntryHash> {
    debug!(" write_chunk() {:?}", data);
    let response = call_delivery_zome("commit_parcel_chunk", data)?;
    let eh: EntryHash = decode_response(response)?;
    Ok(eh)
}


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct WriteManifestInput {
    //pub data_hash: String,
    pub filename: String,
    pub filetype: String,
    pub orig_filesize: usize,
    pub chunks: Vec<EntryHash>,
}


///
#[hdk_extern]
pub fn commit_file_manifest(input: WriteManifestInput) -> ExternResult<EntryHash> {
    /// Commit Manifest
    let manifest = ParcelManifest {
        name: input.filename,
        custum_entry_type: format!("split_file_{}", input.filetype),
        size: input.orig_filesize,
        chunks: input.chunks,
    };
    let response = call_delivery_zome("commit_parcel_manifest", manifest)?;
    let eh: EntryHash = decode_response(response)?;
    /// Done
    return Ok(eh);
}
