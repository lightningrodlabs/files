use hdk::prelude::*;
use zome_utils::*;

use zome_delivery_types::*;
use zome_delivery_api::*;
use zome_file_share_integrity::*;


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct SendFileInput {
    pub secret_eh: EntryHash,
    pub strategy: DistributionStrategy,
    pub recipients: Vec<AgentPubKey>,
}

/// Zome Function
#[hdk_extern]
pub fn send_file(input: SendFileInput) -> ExternResult<EntryHash> {
    debug!("send_secret() START {:?}", input.secret_eh);
    debug!("send_secret() zome_names: {:?}", dna_info()?.zome_names);
    debug!("send_secret() zome_index: {:?}", zome_info()?.id);
    debug!("send_secret()  zome_name: {:?}", zome_info()?.name);

    /// Determine parcel type depending on Entry
    let maybe_secret: ExternResult<Secret> = get_typed_from_eh(input.secret_eh.clone());
    let zome_name =ZomeName::from("secret_integrity");
    let parcel_ref = if let Ok(_secret) = maybe_secret {
        ParcelReference::AppEntry(EntryReference {
            eh: input.secret_eh,
            zome_name,
            entry_index: EntryDefIndex::from(get_variant_index:: < SecretEntry>(SecretEntryTypes::Secret)?),
            visibility: EntryVisibility::Private,
        }
        )
    } else {
        /// Should be a Manifest
        let _: ParcelManifest = get_typed_from_eh(input.secret_eh.clone())?;
        let mref = ManifestReference {
            manifest_eh: input.secret_eh,
            entry_zome_name: zome_name,
            entry_type_name: "secret".to_string(),
        };
        ParcelReference::Manifest(mref)
    };

    let distribution = DistributeParcelInput {
        recipients: input.recipients,
        strategy: input.strategy,
        parcel_ref,
    };
    debug!("send_secret() calling distribute_parcel() with: {:?}", distribution);
    let response = call_delivery_zome("distribute_parcel", distribution)?;
    // distribute_parcel(distribution)?;
    let eh: EntryHash = decode_response(response)?;
    debug!("send_secret() END");
    Ok(eh)
}
