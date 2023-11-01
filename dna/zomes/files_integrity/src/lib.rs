#![allow(non_upper_case_globals)]
#![allow(unused_doc_comments)]
#![allow(non_camel_case_types)]
#![allow(non_snake_case)]
#![allow(unused_attributes)]


///--------------------------------------------------------------------------------------------------
/// Global consts
///--------------------------------------------------------------------------------------------------

pub const FILES_DEFAULT_INTEGRITY_ZOME_NAME: &'static str = "files_integrity";
pub const FILES_DEFAULT_COORDINATOR_ZOME_NAME: &'static str = "zFiles";
pub const FILES_DEFAULT_ROLE_NAME: &'static str = "rFiles";

pub const FILE_TYPE_NAME: &'static str = "split_file";


///-------------------------------------------------------------------------------------------------
/// Declaration of this zome's entry types
///-------------------------------------------------------------------------------------------------

/// Integrity zome is not really necessary but it is defined because the holochain ecosystem
/// does not support well a zome that does not have one.

use hdi::prelude::*;

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
