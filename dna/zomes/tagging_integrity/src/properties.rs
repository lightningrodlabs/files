use hdi::prelude::*;

/// Dna properties
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, SerializedBytes)]
#[serde(rename_all = "camelCase")]
pub struct TaggingProperties {
   pub min_tag_name_length: u8,
   pub max_tag_name_length: u16,
}


/// Return the DNA properties
pub fn get_properties() -> ExternResult<TaggingProperties> {
   //debug!("*** get_properties() called");
   let dna_info = dna_info()?;
   let props = dna_info.modifiers.properties;
   //debug!("props = {:?}", props);
   let maybe_properties: Result<TaggingProperties, <TaggingProperties as TryFrom<SerializedBytes>>::Error> = props.try_into();
   if let Err(e) = maybe_properties {
      debug!("deserializing properties failed: {:?}", e);
      panic!("Should deserialize dna properties");
   }
   Ok(maybe_properties.unwrap())
}


/// Helper for crate use
pub fn get_dna_properties() -> TaggingProperties {
   return get_properties().unwrap();
}
