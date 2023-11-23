use hdk::prelude::*;
//use zome_utils::*;
use zome_delivery_api::*;

// /// Zome Callback
// #[hdk_extern]
// fn init(_: ()) -> ExternResult<InitCallbackResult> {
//    /// Setup initial capabilities
//    init_caps()?;
//    /// Done
//    debug!("*** zFiles.init() callback DONE");
//    Ok(InitCallbackResult::Pass)
// }
//
//
// fn init_caps() -> ExternResult<()> {
//    let mut functions = BTreeSet::new();
//    functions.insert((zome_info()?.name, "get_any_record".into()));
//    functions.insert((zome_info()?.name, "receive_delivery_dm".into())); //HACK: Copied this from delivery zome since Holochain does not support multiple unrestricted capGrants.
//
//    create_cap_grant(
//       CapGrantEntry {
//          tag: "".into(),
//          access: ().into(), // empty access converts to unrestricted
//          functions: hdk::prelude::GrantedFunctions::Listed(functions),
//       }
//    )?;
//    Ok(())
// }


/// Zome Callback
#[hdk_extern(infallible)]
fn post_commit(signedActionList: Vec<SignedActionHashed>) {
   debug!("FILES post_commit() called for {} actions", signedActionList.len());
   let res = call_delivery_post_commit(signedActionList);
   if let Err(e) = res {
      debug!("delivery_post_commit() failed: {:?}", e);
   }
}
