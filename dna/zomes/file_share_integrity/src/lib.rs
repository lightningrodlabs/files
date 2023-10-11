#![allow(non_upper_case_globals)]
#![allow(unused_doc_comments)]
#![allow(non_camel_case_types)]
#![allow(non_snake_case)]
#![allow(unused_attributes)]


use hdi::prelude::*;


pub const FILE_TYPE_NAME: &str = "split_file";

pub const FILE_SHARE_ZOME_NAME: &str = "file_share_integrity";

/// Integrity zome is not really necessary but it is defined because the holochain ecosystem
/// does not support well a zome that does not have one.

#[hdk_entry_defs]
#[unit_enum(FileShareEntryTypes)]
pub enum FileShareEntry {
   #[entry_def(required_validations = 2, visibility = "private")]
   FileShare(FileShare),
}

/// Bogus Entry
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct FileShare {
   pub value: String,
}
