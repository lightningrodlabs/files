use hdk::prelude::*;
use zome_utils::*;
use zome_delivery_api::*;

/// Process inbox
#[hdk_extern]
pub fn process_inbox(_: ()) -> ExternResult<()> {
    debug!("START");
    std::panic::set_hook(Box::new(zome_panic_hook));
    let response = call_delivery_zome("pull_inbox", ())?;
    let _committed_parcels: Vec<ActionHash> = decode_response(response)?;
    debug!("END");
    Ok(())
}
