use hdi::prelude::*;


/// Entry representing the Private Encryption Key of an Agent
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct PrivEncKey {
   pub value: XSalsa20Poly1305KeyRef,
}

impl PrivEncKey {
   pub fn new(value: XSalsa20Poly1305KeyRef) -> Self {
      Self {
         value,
      }
   }
}
