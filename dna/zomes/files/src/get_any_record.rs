use hdk::prelude::*;


///
#[ignore(zits)]
#[hdk_extern]
pub fn get_any_record(hash: AnyDhtHash) -> ExternResult<Option<Record>> {
    let maybeRecord = get(hash.clone(), GetOptions::network())?;
    Ok(maybeRecord)
}


///
#[hdk_extern]
pub fn get_ah(eh: EntryHash) -> ExternResult<Option<ActionHash>> {
    debug!("get_ah() {}", eh);
    let maybe_record = get(eh, GetOptions::network())?;
    let Some(record) = maybe_record
        else {return Ok(None)};
    Ok(Some(record.action_address().to_owned()))
}
