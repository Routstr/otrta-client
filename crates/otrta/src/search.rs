use reqwest::Client;
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::{
    completion::create_search_completion_request,
    db::user_searches::{SearchResponse, SearchSource, SearchSourceMetadata},
    models::AppState,
    proxy::forward_request_with_payment_with_body,
};

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchRequest {
    pub message: String,
    pub group_id: String,
    pub conversation: Option<Vec<ConversationEntry>>,
    pub urls: Option<Vec<String>>,
    pub model_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConversationEntry {
    pub human: String,
    pub assistant: String,
}

pub async fn perform_web_search_with_llm(
    state: &Arc<AppState>,
    query: &str,
    urls: Option<Vec<String>>,
    conversation: Option<&[ConversationEntry]>,
    model_id: Option<&str>,
    organization_id: &uuid::Uuid,
) -> Result<SearchResponse, Box<dyn std::error::Error>> {
    let client = Client::new();
    let mut sources = Vec::new();

    if let Some(url_list) = urls {
        for url in url_list {
            match scrape_url(&client, &url).await {
                Ok(content) => {
                    sources.push(SearchSource {
                        metadata: SearchSourceMetadata {
                            url: url.clone(),
                            title: Some(extract_title_from_content(&content)),
                            description: Some(
                                content.chars().take(200).collect::<String>() + "...",
                            ),
                        },
                        content,
                    });
                }
                Err(e) => {
                    eprintln!("Failed to scrape URL {}: {}", url, e);
                }
            }
        }
    }

    let response_message = if let Some(model) = model_id {
        eprintln!("Processing search with model: {}", model);

        let completion_request = create_search_completion_request(
            model,
            query,
            conversation,
            if sources.is_empty() {
                None
            } else {
                Some(&sources)
            },
        );

        let headers = axum::http::HeaderMap::new();
        let response = forward_request_with_payment_with_body(
            headers,
            state,
            "v1/chat/completions",
            Some(completion_request),
            false,
            None,                  // api_key_id
            Some(organization_id), // organization_id
        )
        .await;

        let status = response.status();

        // Always fall back to basic search for any non-OK status
        if status != axum::http::StatusCode::OK {
            eprintln!(
                "LLM request failed with status: {}, falling back to basic search",
                status
            );
            generate_search_response(query, &sources)
        } else {
            match axum::body::to_bytes(response.into_body(), usize::MAX).await {
                Ok(bytes) => {
                    let response_text = String::from_utf8_lossy(&bytes);

                    // Double-check that this isn't an error response
                    if response_text.contains("{\"error\"")
                        || response_text.contains("\"type\":\"payment_error\"")
                    {
                        eprintln!("Detected error response in LLM body despite OK status, falling back to basic search");
                        generate_search_response(query, &sources)
                    } else if let Ok(completion_response) = serde_json::from_str::<
                        crate::completion::ChatCompletionResponse,
                    >(&response_text)
                    {
                        // Map citations from the LLM response back to our sources
                        let cited_sources = map_citations_to_sources(&completion_response, &sources);
                        
                        // Update sources to only include the ones that were cited
                        sources = cited_sources;
                        
                        completion_response
                            .choices
                            .first()
                            .map(|choice| choice.message.content.clone())
                            .unwrap_or_else(|| {
                                eprintln!("Empty LLM response, falling back to basic search");
                                generate_search_response(query, &sources)
                            })
                    } else {
                        eprintln!("Failed to parse LLM response as completion, falling back to basic search");
                        generate_search_response(query, &sources)
                    }
                }
                Err(e) => {
                    eprintln!(
                        "Failed to read LLM response body: {}, falling back to basic search",
                        e
                    );
                    generate_search_response(query, &sources)
                }
            }
        }
    } else {
        generate_search_response(query, &sources)
    };

    Ok(SearchResponse {
        message: response_message,
        sources: if sources.is_empty() {
            None
        } else {
            Some(sources)
        },
    })
}

pub async fn perform_web_search(
    query: &str,
    urls: Option<Vec<String>>,
) -> Result<SearchResponse, Box<dyn std::error::Error>> {
    let client = Client::new();
    let mut sources = Vec::new();

    if let Some(url_list) = urls {
        for url in url_list {
            match scrape_url(&client, &url).await {
                Ok(content) => {
                    sources.push(SearchSource {
                        metadata: SearchSourceMetadata {
                            url: url.clone(),
                            title: Some(extract_title_from_content(&content)),
                            description: Some(
                                content.chars().take(200).collect::<String>() + "...",
                            ),
                        },
                        content,
                    });
                }
                Err(e) => {
                    eprintln!("Failed to scrape URL {}: {}", url, e);
                }
            }
        }
    } else {
        sources.push(SearchSource {
            metadata: SearchSourceMetadata {
                url: "https://example.com".to_string(),
                title: Some("Example Search Result".to_string()),
                description: Some("This is a mock search result".to_string()),
            },
            content: format!("Search results for: {}", query),
        });
    }

    let response_message = generate_search_response(query, &sources);

    Ok(SearchResponse {
        message: response_message,
        sources: Some(sources),
    })
}

fn map_citations_to_sources(
    completion_response: &crate::completion::ChatCompletionResponse,
    original_sources: &[SearchSource],
) -> Vec<SearchSource> {
    let mut cited_sources = Vec::new();
    
    // Collect all cited URLs from the completion response
    let mut cited_urls = std::collections::HashSet::new();
    
    // Add URLs from the top-level citations field
    if let Some(citations) = &completion_response.citations {
        for citation in citations {
            cited_urls.insert(citation.clone());
        }
    }
    
    // Add URLs from annotations in the response message
    if let Some(choice) = completion_response.choices.first() {
        if let Some(annotations) = &choice.message.annotations {
            for annotation in annotations {
                if let Some(url_citation) = &annotation.url_citation {
                    cited_urls.insert(url_citation.url.clone());
                }
            }
        }
    }
    
    // Map cited URLs back to original sources
    for source in original_sources {
        if cited_urls.contains(&source.metadata.url) {
            cited_sources.push(source.clone());
        }
    }
    
    // If no citations were found, return all original sources as fallback
    if cited_sources.is_empty() {
        eprintln!("No citations found in LLM response, returning all original sources");
        return original_sources.to_vec();
    }
    
    cited_sources
}

async fn scrape_url(client: &Client, url: &str) -> Result<String, Box<dyn std::error::Error>> {
    let response = client.get(url).send().await?;
    let html = response.text().await?;
    let document = Html::parse_document(&html);

    let body_selector = Selector::parse("body").unwrap();
    if let Some(body) = document.select(&body_selector).next() {
        Ok(body.text().collect::<Vec<_>>().join(" "))
    } else {
        Ok(html)
    }
}

fn extract_title_from_content(content: &str) -> String {
    content
        .lines()
        .next()
        .unwrap_or("Untitled")
        .chars()
        .take(100)
        .collect()
}

fn generate_search_response(query: &str, sources: &[SearchSource]) -> String {
    if sources.is_empty() {
        format!("I searched for '{}' but couldn't find any specific sources. Here's what I can tell you based on general knowledge.", query)
    } else {
        format!(
            "Here's what I found regarding '{}': {}. The search returned relevant information from various sources.",
            query,
            sources.iter()
                .map(|s| format!("From {}: {}", s.metadata.url, s.content.chars().take(100).collect::<String>()))
                .collect::<Vec<_>>()
                .join("; ")
        )
    }
}
