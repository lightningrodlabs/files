use hdk::prelude::*;
use zome_utils::*;
use zome_tagging_integrity::*;
use crate::TaggingInput;


///
#[hdk_extern]
pub fn query_all_PrivateTags(_: ()) -> ExternResult<Vec<(EntryHash, Timestamp, String)>> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    /// Get all Create Elements with query
    let tuples = get_all_typed_local::<PrivateTag>(TaggingEntryTypes::PrivateTag.try_into().unwrap())?;
    let res = tuples.into_iter()
        .map(|(_, create, typed)| (create.entry_hash, create.timestamp, typed.value))
        .collect();
    /// Done
    Ok(res)
}


#[hdk_extern]
fn create_private_tag(tag_value: String) -> ExternResult<EntryHash> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    /// Make sure Tag does not already exists
    let private_tags: Vec<String> = query_all_PrivateTags(())?
        .into_iter()
        .map(|(_, _, tag)| (tag))
        .collect();
    if private_tags.contains(&tag_value) {
        return error("Private tag already exists");
    }
    /// Make sur tag length is OK
    let properties = get_dna_properties();
    if  tag_value.len() > properties.max_tag_name_length as usize ||
        tag_value.len() < properties.min_tag_name_length as usize {
        return error("Tag length is incorrect.");
    }
    /// Create Entry
    let tag = PrivateTag { value: tag_value };
    let eh = hash_entry(tag.clone())?;
    let _ah = create_entry(TaggingEntry::PrivateTag(tag.clone()))?;
    /// Done
    Ok(eh)
}


///
pub fn query_private_entry(eh: EntryHash) -> ExternResult<Record> {
    /// Query type
    let record = get_local_from_eh(eh)?;

    let maybe_visibility = record.signed_action
        .action()
        .entry_data()
        .map(|(_, entry_type)| entry_type.visibility());

    let Some(visiblity) = maybe_visibility
        else { return error("Visiblity not found")};

    if visiblity.is_public() {
        return error("Entry is Public");
    }

    /// Done
    Ok(record)
}




#[hdk_extern]
fn tag_private_entry(input: TaggingInput) -> ExternResult<()> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    /// Dedup
    let mut tags = input.tags.clone();
    let set: HashSet<_> = tags.drain(..).collect();
    tags.extend(set.into_iter());
    /// Make sure entry exist and is private
    let _record = query_private_entry(input.target.clone())?;
    /// Grab existing private tags
    let private_tuples = query_all_PrivateTags(())?;
    let private_tags: Vec<String> = private_tuples.iter()
        .map(|(_, _create, tag)| tag.to_owned())
        .collect();
    /// Link to/from each tag (create PrivateTag entry if necessary)
    for tag in tags {
        let maybe_index = private_tags.iter().position(|r| r == &tag);

        let tag_eh =
            if maybe_index.is_none() {
                let eh = create_private_tag(tag)?;
                eh
            } else {
                let eh = private_tuples[maybe_index.unwrap()].0.clone();
                eh
            }
        ;
        let _ = create_link(tag_eh.clone(), input.target.clone(), TaggingLinkTypes::PrivateEntry, LinkTag::from(input.link_tag_to_entry.clone()))?;
        let _ = create_link( input.target.clone(), tag_eh, TaggingLinkTypes::PrivateTags, LinkTag::from(()))?;
    }
    Ok(())
}


///
#[hdk_extern]
pub fn get_private_tags(eh: EntryHash) -> ExternResult<Vec<(EntryHash, String)>> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    /// Make sure entry exist and is private
    let _record = query_private_entry(eh.clone())?;
    /// Grab private tags
    let link_tuples = get_typed_from_links::<PrivateTag>(eh, TaggingLinkTypes::PrivateTags, None)?;
    let res = link_tuples.into_iter()
        .map(|(tag_entry, link)| (link.target.into_entry_hash().unwrap(), tag_entry.value))
        .collect();
    /// Done
    Ok(res)
}
