use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatCompletionRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
    #[serde(flatten)]
    pub extra: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: Vec<MessageContent>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum MessageContent {
    #[serde(rename = "text")]
    Text { text: String },
    #[serde(rename = "image_url")]
    ImageUrl { image_url: ImageUrl },
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImageUrl {
    pub url: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatCompletionResponse {
    pub id: String,
    pub created: u64,
    pub model: String,
    pub object: String,
    pub system_fingerprint: Option<String>,
    pub choices: Vec<Choice>,
    pub usage: Usage,
    pub provider: Option<String>,
    pub citations: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Choice {
    pub finish_reason: String,
    pub index: u32,
    pub message: ResponseMessage,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ResponseMessage {
    pub content: String,
    pub role: String,
    pub tool_calls: Option<serde_json::Value>,
    pub function_call: Option<serde_json::Value>,
    pub annotations: Option<Vec<Annotation>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Annotation {
    #[serde(rename = "type")]
    pub annotation_type: String,
    pub url_citation: Option<UrlCitation>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UrlCitation {
    pub end_index: u32,
    pub start_index: u32,
    pub title: String,
    pub url: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Usage {
    pub completion_tokens: u32,
    pub prompt_tokens: u32,
    pub total_tokens: u32,
    pub completion_tokens_details: Option<serde_json::Value>,
    pub prompt_tokens_details: Option<serde_json::Value>,
}

pub fn create_search_completion_request(
    model: &str,
    query: &str,
    conversation: Option<&[crate::search::ConversationEntry]>,
    sources: Option<&[crate::db::user_searches::SearchSource]>,
) -> ChatCompletionRequest {
    let mut messages = Vec::new();

    let system_prompt = if let Some(sources) = sources {
        let source_content = sources
            .iter()
            .map(|s| {
                format!(
                    "Source: {}\nTitle: {}\nContent: {}",
                    s.metadata.url,
                    s.metadata.title.as_deref().unwrap_or("Unknown"),
                    s.content
                )
            })
            .collect::<Vec<_>>()
            .join("\n\n");

        format!(
            "You are a helpful search assistant. Use the following sources to answer the user's question comprehensively. Always cite sources when relevant.\n\nSources:\n{}",
            source_content
        )
    } else {
        "You are a helpful search assistant. Answer the user's question based on your knowledge."
            .to_string()
    };

    messages.push(ChatMessage {
        role: "system".to_string(),
        content: vec![MessageContent::Text {
            text: system_prompt,
        }],
    });

    if let Some(conv) = conversation {
        for entry in conv {
            messages.push(ChatMessage {
                role: "user".to_string(),
                content: vec![MessageContent::Text {
                    text: entry.human.clone(),
                }],
            });
            messages.push(ChatMessage {
                role: "assistant".to_string(),
                content: vec![MessageContent::Text {
                    text: entry.assistant.clone(),
                }],
            });
        }
    }

    messages.push(ChatMessage {
        role: "user".to_string(),
        content: vec![MessageContent::Text {
            text: query.to_string(),
        }],
    });

    ChatCompletionRequest {
        model: model.to_string(),
        messages,
        extra: serde_json::Value::Object(serde_json::Map::new()),
    }
}

pub fn parse_completion_response(
    response_text: &str,
    model: &str,
    sources: Option<&[crate::db::user_searches::SearchSource]>,
) -> Result<ChatCompletionResponse, Box<dyn std::error::Error>> {
    let created = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let citations = sources.map(|s| {
        s.iter()
            .map(|source| source.metadata.url.clone())
            .collect::<Vec<_>>()
    });

    let annotations = sources.map(|s| {
        s.iter()
            .map(|source| Annotation {
                annotation_type: "url_citation".to_string(),
                url_citation: Some(UrlCitation {
                    end_index: 0,
                    start_index: 0,
                    title: source
                        .metadata
                        .title
                        .clone()
                        .unwrap_or_else(|| source.metadata.url.clone()),
                    url: source.metadata.url.clone(),
                }),
            })
            .collect::<Vec<_>>()
    });

    let response = ChatCompletionResponse {
        id: format!(
            "gen-{}-{}",
            created,
            &Uuid::new_v4().to_string().replace("-", "")[..12]
        ),
        created,
        model: model.to_string(),
        object: "chat.completion".to_string(),
        system_fingerprint: None,
        choices: vec![Choice {
            finish_reason: "stop".to_string(),
            index: 0,
            message: ResponseMessage {
                content: response_text.to_string(),
                role: "assistant".to_string(),
                tool_calls: None,
                function_call: None,
                annotations,
            },
        }],
        usage: Usage {
            completion_tokens: response_text.split_whitespace().count() as u32,
            prompt_tokens: 50,
            total_tokens: response_text.split_whitespace().count() as u32 + 50,
            completion_tokens_details: None,
            prompt_tokens_details: None,
        },
        provider: None,
        citations,
    };

    Ok(response)
}
