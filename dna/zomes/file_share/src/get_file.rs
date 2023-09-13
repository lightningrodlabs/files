use hdk::prelude::*;
use zome_utils::*;

use zome_delivery_types::*;
use zome_delivery_api::*;
use zome_file_share_integrity::*;

/// Return
#[hdk_extern]
pub fn get_file(eh: EntryHash) -> ExternResult<(ParcelManifest, String)> {
    /// Not a Secret Entry, could be a Manifest
    let maybe_manifest: ExternResult<ParcelManifest> = get_typed_from_eh(eh);
    let Ok(manifest) = maybe_manifest
        else { return error("No ParcelManifest found at given EntryHash"); };
    debug!("get_file(): {}", manifest.data_type);
    if &manifest.data_type[..FILE_TYPE_NAME.len()] != FILE_TYPE_NAME {
        return error("ParcelManifest is not holding a File.");
    }
    /// Get all chunks
    let set: HashSet<_> = manifest.chunks.clone().drain(..).collect(); // dedup
    let query_args = ChainQueryFilter::default()
        .include_entries(true)
        .entry_hashes(set);
    let records = query(query_args)?;
    if records.len() != manifest.chunks.len() {
        return error("Not all chunks have been found on chain");
    }
    let mut file_data = String::new();
    for record in records {
        let chunk: ParcelChunk = get_typed_from_record(record)?;
        file_data += &chunk.data;
    }
    /// Done
    Ok((manifest, file_data))
}




/// Return list of parcels' EntryHash from a particular Agent
#[hdk_extern]
pub fn get_files_from(sender: AgentPubKey) -> ExternResult<Vec<EntryHash>> {
    debug!("get_files_from() START: {:?}", sender);
    let response = call_delivery_zome("pull_inbox", ())?;
    let inbox_items: Vec<ActionHash> = decode_response(response)?;
    debug!("get_files_from() - inbox_items: {}", inbox_items.len());
    debug!("get_files_from() - query_DeliveryNotice");
    let response = call_delivery_zome(
        "query_DeliveryNotice",
        DeliveryNoticeQueryField::Sender(sender),
    )?;
    let notices: Vec<DeliveryNotice> = decode_response(response)?;
    let parcels: Vec<EntryHash> = notices.iter().map(|x| x.summary.parcel_reference.entry_address()).collect();
    debug!("get_files_from() END - secret parcels found: {}", parcels.len());
    Ok(parcels)
}


///
#[hdk_extern]
pub fn refuse_file_share(parcel_eh: EntryHash) -> ExternResult<EntryHash> {
    return respond_to_file_share_notice(parcel_eh, false);
}


///
#[hdk_extern]
pub fn accept_file_share(parcel_eh: EntryHash) -> ExternResult<EntryHash> {
    return respond_to_file_share_notice(parcel_eh, true);
}


///
pub fn respond_to_file_share_notice(parcel_eh: EntryHash, has_accepted: bool) -> ExternResult<EntryHash> {
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

