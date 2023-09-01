#![allow(non_upper_case_globals)]
#![allow(unused_doc_comments)]
#![allow(non_camel_case_types)]
#![allow(non_snake_case)]
#![allow(unused_attributes)]


use hdi::prelude::*;

#[hdk_entry_defs]
#[unit_enum(SecretEntryTypes)]
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
