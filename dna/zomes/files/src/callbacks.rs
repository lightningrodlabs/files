use hdk::prelude::*;
//use zome_utils::*;
use zome_delivery_api::*;


/// Zome Callback
#[hdk_extern(infallible)]
fn post_commit(signedActionList: Vec<SignedActionHashed>) {
   debug!("FILE_SHARE post_commit() called for {} actions", signedActionList.len());
   let res = call_delivery_post_commit(signedActionList);
   if let Err(e) = res {
      debug!("delivery_post_commit() failed: {:?}", e);
   }
}
