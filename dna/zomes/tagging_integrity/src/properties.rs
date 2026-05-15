use hdi::prelude::*;
use crate::TAGGING_DEFAULT_COORDINATOR_ZOME_NAME;

#[hdk_extern]
pub fn genesis_self_check(_data: GenesisSelfCheckData) -> ExternResult<ValidateCallbackResult> {
   debug!("{} genesis_self_check() CALLED", TAGGING_DEFAULT_COORDINATOR_ZOME_NAME);
   let _info = dna_info()?;
   let Ok(properties) = get_properties() else {
      return Ok(ValidateCallbackResult::Invalid("No properties".into()));
   };
   // debug!("genesis_self_check() properties {:?}", properties);
   ///
   return properties.validate();
}


/// Dna properties
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, SerializedBytes)]
#[serde(rename_all = "camelCase")]
pub struct TaggingProperties {
   pub min_tag_name_length: u8,
   pub max_tag_name_length: u16,
}

impl TaggingProperties {
   pub fn new(min_tag_name_length: u8, max_tag_name_length: u16) -> Self {
      Self { min_tag_name_length, max_tag_name_length }
   }
}

/// Return the DNA properties
pub fn get_properties() -> ExternResult<TaggingProperties> {
   //debug!("*** get_properties() called");
   let dna_info = dna_info()?;
   let props = dna_info.modifiers.properties;
   //debug!("props = {:?}", props);
   let maybe_properties: Result<TaggingProperties, <TaggingProperties as TryFrom<SerializedBytes>>::Error> =
      props.try_into();
   if let Err(e) = maybe_properties {
      debug!("Deserializing TaggingZome properties failed: {:?}", e);
      return Err(wasm_error!("Deserializing TaggingZome properties failed: {:?}", e));
   }
   Ok(maybe_properties.unwrap())
}


impl TaggingProperties {
   pub fn validate(&self) -> ExternResult<ValidateCallbackResult> {
      if self.max_tag_name_length == 0 {
         return Ok(ValidateCallbackResult::Invalid("DNA Property \"max_tag_name_length\" must be > 0".to_string()));
      }
      if self.max_tag_name_length < self.min_tag_name_length as u16 {
         return Ok(ValidateCallbackResult::Invalid("DNA Property \"max_tag_name_length\" must be bigger than \"min_tag_name_length\"".to_string()));
      }
      ///
      Ok(ValidateCallbackResult::Valid)
   }
}


#[cfg(test)]
mod tests {
   use super::*;

   fn assert_invalid(properties: TaggingProperties) {
      let result = properties.validate().expect("validation should not fail");
      match result {
         ValidateCallbackResult::Invalid(_message) => (),
         other => panic!("expected invalid validation result, got {:?}", other),
      }
   }

   fn assert_valid(properties: TaggingProperties) {
      let result = properties.validate().expect("validation should not fail");
      match result {
         ValidateCallbackResult::Valid => (),
         other => panic!("expected valid validation result, got {:?}", other),
      }
   }

   #[test]
   fn valid_properties() {
      assert_valid(TaggingProperties::new(1, 3));
      assert_valid(TaggingProperties::new(3, 3));
   }

   #[test]
   fn invalid_properties() {
      assert_invalid(TaggingProperties::new(0, 0));
      assert_invalid(TaggingProperties::new(10, 3));
      assert_invalid(TaggingProperties::new(10, 0));
   }
}
