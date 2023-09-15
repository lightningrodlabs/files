use hdk::prelude::*;
use zome_utils::*;

use zome_delivery_types::*;
use zome_delivery_api::*;
use zome_file_share_integrity::*;


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct SendFileInput {
    pub manifest_eh: EntryHash,
    pub strategy: DistributionStrategy,
    pub recipients: Vec<AgentPubKey>,
}

/// Return Distribution ActionHash
#[hdk_extern]
pub fn send_file(input: SendFileInput) -> ExternResult<ActionHash> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    debug!("START {:?}", input.manifest_eh);
    debug!("zome_names: {:?}", dna_info()?.zome_names);
    debug!("zome_index: {:?}", zome_info()?.id);
    debug!(" zome_name: {:?}", zome_info()?.name);

    // TODO: Make sure manifest exists and is of File type.

    /// Form Parcel Reference
    let parcel_ref = ParcelReference {
        eh: input.manifest_eh,
        zome_origin: ZomeName::from("file_share_integrity"),
        visibility: EntryVisibility:Private,
        kind_info: ParcelKind::Manifest(FILE_TYPE_NAME.to_string()),
    };
    /// Form Distribution
    let distribute_input = DistributeParcelInput {
        recipients: input.recipients,
        strategy: input.strategy,
        parcel_name:
        parcel_ref,
    };
    /// Distribute
    debug!("calling distribute_parcel() with: {:?}", distribution);
    let response = call_delivery_zome("distribute_parcel", distribute_input)?;
    let ah: ActionHash = decode_response(response)?;
    debug!("END");
    Ok(ah)
}
