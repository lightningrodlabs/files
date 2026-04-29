mod properties;
pub use properties::*;

//--------------------------------------------------------------------------------------------------

use hdi::prelude::*;

pub const TAGGING_DEFAULT_COORDINATOR_ZOME_NAME: &'static str = "zTagging";
pub const TAGGING_DEFAULT_INTEGRITY_ZOME_NAME: &'static str = "tagging_integrity";
pub const PUBLIC_TAG_ROOT: &str = "public_tags";


#[hdk_entry_types]
#[unit_enum(TaggingEntryTypes)]
pub enum TaggingEntry {
   #[entry_type(required_validations = 2, visibility = "private")]
   PrivateTag(PrivateTag),
}

///
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct PrivateTag {
   pub value: String,
}

#[hdk_link_types]
#[derive(Serialize, Deserialize)]
pub enum TaggingLinkTypes {
   PublicPath,
   PublicEntry,
   PrivateEntry,
   PublicTags,
   PrivateTags,
}
