use hdk::prelude::{*};
use hc_zome_notifications::*;

/// Architecture: Run an agent as the Notifier agent that has credentials to notification services
/// Notifiers register themselves as available Notifiers in the DHT.
/// Agents grabs the list of Notifiers
/// Agents sends their contact info to the Notifier
/// Agents send "notify some agent" requests to the Notifier.
/// Notifier will lookup for the recipients contact info and process the notification

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct NotificationTip {
    pub retry_count: i32, //The number of times this notification has been retried. Use custom_handle_notification_tip to increment and limit.
    pub status: String, //"stop", "go" or "retry"
    pub message: String, //The message to send to the notificant
    pub notificants: Vec<AgentPubKey>, //The list of notificants to send the message to
    pub contacts: Vec<Contact>, //The list of contacts to send the message to. If left blank, contact details will automatically be retrieved based on the notificants.
    pub extra_context: String, //Any extra data that needs to be passed to the custom_handle_notification_tip function. For example, a hash of an entry.
    pub message_id: String, //A unique identifier of the message to send. For instance, a string containing a timestamp and message content. This is used to automtatically prevent duplicate messages. If left blank, there will be no prevention of duplicate notifications.
    pub destination: String, //Used for debugging. The name of the function that the data is being sent to.
}

#[hdk_extern]
pub fn custom_handle_notification_tip(notificaiton_tip: NotificationTip) -> ExternResult<NotificationTip> {
    // TODO: Any customize handling of notification tip that is needed, including handling retries, collecting a list of notificants, or verifying legitimacy.
    Ok(notificaiton_tip)
}
