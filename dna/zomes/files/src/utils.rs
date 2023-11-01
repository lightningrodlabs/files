use hdk::prelude::*;
use zome_utils::*;

use zome_delivery_types::*;
use zome_files_integrity::{FILES_DEFAULT_INTEGRITY_ZOME_NAME, FILE_TYPE_NAME};

///
pub fn ensure_parcel_is_file(description: &ParcelDescription) -> ExternResult<()> {
    if description.zome_origin != FILES_DEFAULT_INTEGRITY_ZOME_NAME.into() {
        return error(&format!("Parcel is not from '{}' zome. Zome origin: {}", FILES_DEFAULT_INTEGRITY_ZOME_NAME, description.zome_origin));
    }
    let ParcelKind::Manifest(data_type) = description.kind_info.clone() else {
        return error("Parcel is not of type Manifest");
    };
    if &data_type[..FILE_TYPE_NAME.len()] != FILE_TYPE_NAME {
        return error(&format!("Parcel is not of type {}", FILE_TYPE_NAME));
    }
    Ok(())
}

