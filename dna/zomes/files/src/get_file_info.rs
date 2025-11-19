use hdk::prelude::*;
use zome_utils::*;

use crate::utils::ensure_parcel_is_file;
use zome_delivery_types::*;

/// Return manifest
#[hdk_extern]
pub fn get_file_info_local(eh: EntryHash) -> ExternResult<ParcelManifest> {
   std::panic::set_hook(Box::new(zome_panic_hook));
   let manifest: ParcelManifest = get_typed_from_eh(eh, GetStrategy::Local)?;
   ensure_parcel_is_file(&manifest.description)?;
   Ok(manifest)
}

/// Return manifest
#[hdk_extern]
pub fn get_file_info_network(eh: EntryHash) -> ExternResult<ParcelManifest> {
   std::panic::set_hook(Box::new(zome_panic_hook));
   let manifest: ParcelManifest = get_typed_from_eh(eh, GetStrategy::Network)?;
   ensure_parcel_is_file(&manifest.description)?;
   Ok(manifest)
}