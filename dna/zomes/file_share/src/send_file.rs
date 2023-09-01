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

/// Zome Function
#[hdk_extern]
pub fn send_file(input: SendFileInput) -> ExternResult<EntryHash> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    debug!("START {:?}", input.manifest_eh);
    debug!("zome_names: {:?}", dna_info()?.zome_names);
    debug!("zome_index: {:?}", zome_info()?.id);
    debug!(" zome_name: {:?}", zome_info()?.name);

    // TODO: Make sure manifest exists and is of File type.

    /// Form Parcel Reference
    let parcel_ref = ParcelReference::Manifest(ManifestReference {
        manifest_eh: input.manifest_eh,
        entry_zome_name: ZomeName::from("file_share_integrity"),
        entry_type_name: FILE_TYPE_NAME.to_string(),
    });
    /// Form Distribution
    let distribution = DistributeParcelInput {
        recipients: input.recipients,
        strategy: input.strategy,
        parcel_ref,
    };
    /// Distribute
    debug!("calling distribute_parcel() with: {:?}", distribution);
    let response = call_delivery_zome("distribute_parcel", distribution)?;
    let eh: EntryHash = decode_response(response)?;
    debug!("END");
    Ok(eh)
}
