use hdk::prelude::*;
use zome_utils::*;

use zome_delivery_types::*;
use zome_delivery_api::*;
use zome_file_share_integrity::*;

/// Return ehs of all Notices waiting for a response
#[hdk_extern]
pub fn get_unreplied_notices(_:()) -> ExternResult<Vec<(AgentPubKey, EntryHash, usize)>> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    let mut res = Vec::new();
    let response = call_delivery_zome("query_all_DeliveryNotice", ())?;
    let all_notices: Vec<(EntryHash, Timestamp, DeliveryNotice)> = decode_response(response)?;
    for (notice_eh, _ts, notice) in all_notices {
        let ParcelReference::Manifest(mref) = notice.summary.parcel_reference
            else { continue };
        if mref.entry_type_name != FILE_TYPE_NAME {
            continue;
        }
        let response = call_delivery_zome("get_notice_state", notice_eh.clone())?;
        let state: NoticeState = decode_response(response)?;
        if state != NoticeState::Unreplied {
            continue;
        }
        res.push((notice.sender, notice_eh, notice.summary.parcel_size));
    }
    debug!("END");
    return Ok(res);
}
