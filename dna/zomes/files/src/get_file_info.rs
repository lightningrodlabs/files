use hdk::prelude::*;
use zome_utils::*;

use zome_delivery_types::*;
use crate::utils::ensure_parcel_is_file;


/// Return manifest
#[hdk_extern]
pub fn get_file_info(eh: EntryHash) -> ExternResult<ParcelManifest> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    let manifest: ParcelManifest = get_typed_from_eh(eh)?;
    ensure_parcel_is_file(&manifest.description)?;
    Ok(manifest)
}
