use hdk::prelude::*;
use zome_utils::*;

use zome_delivery_types::*;
use zome_delivery_api::*;


/// API sugar
#[hdk_extern]
pub fn refuse_file_share(parcel_eh: EntryHash) -> ExternResult<EntryHash> {
    return respond_to_file_notice(parcel_eh, false);
}


/// API sugar
#[hdk_extern]
pub fn accept_file_share(parcel_eh: EntryHash) -> ExternResult<EntryHash> {
    return respond_to_file_notice(parcel_eh, true);
}


/// Wrapper for Delivery::respond_to_notice()
pub fn respond_to_file_notice(parcel_eh: EntryHash, has_accepted: bool) -> ExternResult<EntryHash> {
    let response = call_delivery_zome(
        "query_DeliveryNotice",
        DeliveryNoticeQueryField::Parcel(parcel_eh),
    )?;
    let notices: Vec<DeliveryNotice> = decode_response(response)?;
    if notices.len() != 1 {
        return zome_error!("No Secret found at given EntryHash");
    }
    let notice_eh = hash_entry(notices[0].clone())?;
    let input = RespondToNoticeInput {
        notice_eh,
        has_accepted,
    };
    let response = call_delivery_zome("respond_to_notice", input)?;
    // return respond_to_notice(input)?;
    let eh: EntryHash = decode_response(response)?;
    Ok(eh)
}

