#![allow(non_upper_case_globals)]
#![allow(unused_doc_comments)]
#![allow(non_camel_case_types)]
#![allow(non_snake_case)]
#![allow(unused_attributes)]

mod private;
pub use private::*;

mod public;
pub use public::*;


//--------------------------------------------------------------------------------------------------

use hdk::prelude::*;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, SerializedBytes)]
pub struct TaggingInput {
    tags: Vec<String>,
    target: EntryHash,
    link_tag_to_entry: String, // Base64 string of data
}


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, SerializedBytes)]
pub struct UntagInput {
    tag: String,
    target: EntryHash,
}
