#![allow(non_upper_case_globals)]
#![allow(unused_doc_comments)]
#![allow(non_camel_case_types)]
#![allow(non_snake_case)]
#![allow(unused_attributes)]


pub mod priv_enc_key;
//pub use priv_enc_key::*;


///--------------------------------------------------------------------------------------------------
/// Global consts
///--------------------------------------------------------------------------------------------------

pub const FILES_DEFAULT_INTEGRITY_ZOME_NAME: &'static str = "files_integrity";
pub const FILES_DEFAULT_COORDINATOR_ZOME_NAME: &'static str = "zFiles";
pub const FILES_DEFAULT_ROLE_NAME: &'static str = "rFiles";

pub const FILE_TYPE_NAME: &'static str = "split_file";


pub const ATTACHMENTS_ROOT: &str = "public_attachments";

///-------------------------------------------------------------------------------------------------
/// Declaration of this zome's entry types
///-------------------------------------------------------------------------------------------------

/// Integrity zome is not really necessary but it is defined because the holochain ecosystem
/// does not support well a zome that does not have one.

use hdi::prelude::*;
use crate::priv_enc_key::PrivEncKey;

#[hdk_entry_defs]
#[unit_enum(FilesEntryTypes)]
pub enum FilesEntry {
   #[entry_def(required_validations = 2, visibility = "private")]
   FileShare(FileShare),
   #[entry_def(required_validations = 1, visibility = "private")]
   PrivEncKey(PrivEncKey),
}


#[hdk_link_types]
#[derive(Serialize, Deserialize)]
pub enum FilesLinkTypes {
   Attachment,
}


/// Bogus Entry
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct FileShare {
   pub value: String,
}



