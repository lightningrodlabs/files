use hdk::prelude::*;
use zome_utils::*;
use zome_files_integrity::{FilesEntry, FilesEntryTypes};
use zome_files_integrity::priv_enc_key::PrivEncKey;


///
pub fn create_enc_key() -> ExternResult<()> {
   let res = x_salsa20_poly1305_shared_secret_create_random(None)?;
   let _ah = create_entry(FilesEntry::PrivEncKey(PrivEncKey::new(res)))?;
   Ok(())
}


///
pub fn get_my_enc_key() -> ExternResult<XSalsa20Poly1305KeyRef> {
   let tuples = get_all_typed_local::<PrivEncKey>(FilesEntryTypes::PrivEncKey.try_into().unwrap())?;
   if tuples.is_empty() {
      return error("No Private encryption key found");
   }
   if tuples.len() > 1 {
      return error("Many Private encryption keys found");
   }
   let res: Vec<PrivEncKey> = tuples.into_iter()
       .map(|(_, _, key)| key)
       .collect();
   Ok(res.first().unwrap().value.clone())
}


/// Input: XSalsa20Poly1305Data
/// Output: XSalsa20Poly1305EncryptedData
#[hdk_extern]
fn encrypt_data(data: XSalsa20Poly1305Data) -> ExternResult<XSalsa20Poly1305EncryptedData> {
   //let salsa: XSalsa20Poly1305Data = data.into();
   let my_priv_key = get_my_enc_key()?;
   /// Encrypt
   let encrypted = x_salsa20_poly1305_encrypt(my_priv_key, data)?;
   /// Done
   Ok(encrypted)
}


/// Input: XSalsa20Poly1305EncryptedData
/// Output: XSalsa20Poly1305Data
#[hdk_extern]
fn decrypt_data(data: XSalsa20Poly1305EncryptedData) -> ExternResult<XSalsa20Poly1305Data> {
   debug!("decrypt_data() {:?}", data);
   //let salsa: XSalsa20Poly1305EncryptedData = data.into();
   let my_priv_key = get_my_enc_key()?;
   /// Encrypt
   let Some(data) = x_salsa20_poly1305_decrypt(my_priv_key, data)?
    else { return error("Failed to decrypt data with key")};
   /// Done
   Ok(data)
}
