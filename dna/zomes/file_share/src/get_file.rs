use hdk::prelude::*;
use zome_utils::*;

use zome_delivery_types::*;
use zome_delivery_api::*;
use zome_file_share_integrity::*;

/// Zome Function
#[hdk_extern]
pub fn get_file(eh: EntryHash) -> ExternResult<String> {
    ///// Check inbox first
    // debug!("get_secret() - pull_inbox");
    // let response = call_delivery_zome("pull_inbox", ())?;
    // let inbox_items: Vec<ActionHash> = decode_response(response)?;
    // debug!("get_secret() - inbox_items: {}", inbox_items.len());
    /// Try to get Secret
    let maybe_secret: ExternResult<Secret> = get_typed_from_eh(eh.clone());
    if let Ok(secret) = maybe_secret {
        debug!("get_secret() - secret found");
        return Ok(secret.value);
    }
    debug!("get_secret() - Secret Entry not found, could be a ParcelManifest");
    /// Not a Secret Entry, could be a Manifest
    let maybe_manifest: ExternResult<ParcelManifest> = get_typed_from_eh(eh);
    if maybe_manifest.is_err() {
        return error("No entry found at given EntryHash");
    }
    let manifest = maybe_manifest.unwrap();
    /// Get all chunks
    let set: HashSet<_> = manifest.chunks.clone().drain(..).collect(); // dedup
    let query_args = ChainQueryFilter::default()
        .include_entries(true)
        .entry_hashes(set);
    let records = query(query_args)?;
    if records.len() != manifest.chunks.len() {
        return error("Not all chunks have been found on chain");
    }
    /// Concat all chunks
    if manifest.custum_entry_type != "split_secret".to_owned() {
        return error("Manifest of an unknown entry type");
    }
    let mut secret = String::new();
    for record in records {
        let chunk: ParcelChunk = get_typed_from_record(record)?;
        secret += &chunk.data;
        secret += ".";
    }
    /// Done
    Ok(secret)
}



/// Zome Function
/// Return list of parcels' EntryHash from a particular Agent
#[hdk_extern]
pub fn get_files_from(sender: AgentPubKey) -> ExternResult<Vec<EntryHash>> {
    debug!("get_secrets_from() START: {:?}", sender);
    let response = call_delivery_zome("pull_inbox", ())?;
    let inbox_items: Vec<ActionHash> = decode_response(response)?;
    debug!("get_secrets_from() - inbox_items: {}", inbox_items.len());
    debug!("get_secrets_from() - query_DeliveryNotice");
    let response = call_delivery_zome(
        "query_DeliveryNotice",
        DeliveryNoticeQueryField::Sender(sender),
    )?;
    let notices: Vec<DeliveryNotice> = decode_response(response)?;
    let parcels: Vec<EntryHash> = notices.iter().map(|x| x.summary.parcel_reference.entry_address()).collect();
    debug!("get_secrets_from() END - secret parcels found: {}", parcels.len());
    Ok(parcels)
}


/// Zome Function
#[hdk_extern]
pub fn refuse_file_share(parcel_eh: EntryHash) -> ExternResult<EntryHash> {
    return respond_to_file_share_notice(parcel_eh, false);

}


/// Zome Function
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

