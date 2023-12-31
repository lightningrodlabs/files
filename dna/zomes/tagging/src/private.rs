use hdk::prelude::*;
use zome_utils::*;
use zome_tagging_integrity::*;
use crate::{TaggingInput, UntagInput};


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
    if let Ok(properties) = get_properties() {
        if tag_value.len() > properties.max_tag_name_length as usize ||
            tag_value.len() < properties.min_tag_name_length as usize {
            return error("Tag length is incorrect.");
        }
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
        let _ = create_link(tag_eh.clone(), input.target.clone(), TaggingLinkTypes::PrivateEntry, str2tag(&input.link_tag_to_entry.clone()))?;
        let _ = create_link( input.target.clone(), tag_eh, TaggingLinkTypes::PrivateTags, LinkTag::from(()))?;
    }
    /// Done
    Ok(())
}


///
#[hdk_extern]
fn untag_private_entry(input: UntagInput) -> ExternResult<()> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    /// Make sure entry exist and is private
    let _record = query_private_entry(input.target.clone())?;
    let tag_eh = hash_entry(PrivateTag { value: input.tag})?;
    /// Get Tag link
    let link_tuples = get_typed_from_links::<PrivateTag>(input.target.clone(), TaggingLinkTypes::PrivateTags, None)?;
    let link_tuple: Vec<(PrivateTag, Link)> = link_tuples.into_iter()
        .filter(|(tag_entry, _link)| {
            let cur_tag_eh = hash_entry(tag_entry.to_owned()).unwrap();
            cur_tag_eh == tag_eh
        })
        .collect();
    if link_tuple.len() != 1 {
        return error("Tag not found on private entry");
    }
    let link = link_tuple[0].1.clone();

    /// Delete Entry -> Tag Link
    let _ = delete_link(link.create_link_hash)?;
    /// Get reverse link
    let tag_eh = hash_entry(link_tuple[0].0.clone())?;
    let links = get_links(tag_eh, TaggingLinkTypes::PrivateEntry, None)?;
    let link: Vec<Link> = links.into_iter()
        .filter(|link| link.target.clone().into_entry_hash() == Some(input.target.clone()))
        .collect();
    if link.len() != 1 {
        return error("No reverse link found for private entry tag");
    }
    /// Delete Tag Link -> Entry
    let _ = delete_link(link[0].clone().create_link_hash)?;
    /// Done
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


///
#[hdk_extern]
pub fn get_private_entries_with_tag(tag: String) -> ExternResult<Vec<(EntryHash, String)>> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    /// Search for tag
    let private_tags = query_all_PrivateTags(())?;
    for tuple in private_tags {
        if tuple.2 == tag {
            /// Found: grab links
            let links = get_links(tuple.0, TaggingLinkTypes::PrivateEntry, None)?;
            let res = links.into_iter()
                .map(|link| (link.target.into_entry_hash().unwrap(), tag2str(&link.tag).unwrap()))
                .collect();
            return Ok(res);
        }
    }
    /// Done
    debug!("Tag not found");
    return Ok(Vec::new());
}
