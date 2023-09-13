use hdk::prelude::*;
use zome_utils::*;

use zome_delivery_types::*;
use zome_delivery_api::*;
use zome_file_share_integrity::*;


/// Return ehs of all ParcelManifest for type FILE_TYPE_NAME
#[hdk_extern]
pub fn get_local_files(_:()) -> ExternResult<Vec<(EntryHash, ParcelManifest)>> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    let response = call_delivery_zome("get_all_local_parcels", ())?;
    let manifests: Vec<(EntryHash, ParcelManifest)> = decode_response(response)?;
    debug!("manifests found: {}", manifests.len());
    let file_manifests = manifests.into_iter()
        .filter(|(_eh, manifest)| &manifest.data_type[..FILE_TYPE_NAME.len()] == FILE_TYPE_NAME)
        .collect();
    Ok(file_manifests)
}
