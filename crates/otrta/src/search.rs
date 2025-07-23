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
    user_id: Option<&str>,
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
            user_id,
            crate::db::transaction::TransactionType::Chat,
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
                        println!("{:?}", response_text);
                        // Map citations from the LLM response back to our sources
                        let cited_sources =
                            map_citations_to_sources(&completion_response, &sources);

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
    let urls_provided = urls.is_some();

    if let Some(ref url_list) = urls {
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

    let response_message = if sources.is_empty() && urls_provided {
        "I was unable to access or scrape any of the provided URLs. Please check that the URLs are accessible and try again.".to_string()
    } else if sources.is_empty() {
        "No search sources were provided. Please provide URLs to search or use the AI-enhanced search with a selected model.".to_string()
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

fn map_citations_to_sources(
    completion_response: &crate::completion::ChatCompletionResponse,
    _original_sources: &[SearchSource], // Keep parameter for future use but ignore for now
) -> Vec<SearchSource> {
    let mut cited_sources = Vec::new();
    let mut processed_urls = std::collections::HashSet::new();

    if let Some(choice) = completion_response.choices.first() {
        if let Some(annotations) = &choice.message.annotations {
            eprintln!("Found {} annotations in message", annotations.len());
            for annotation in annotations {
                if let Some(url_citation) = &annotation.url_citation {
                    let url = &url_citation.url;
                    eprintln!("Processing annotation URL: {}", url);

                    if !processed_urls.contains(url) {
                        cited_sources.push(SearchSource {
                            metadata: crate::db::user_searches::SearchSourceMetadata {
                                url: url.clone(),
                                title: Some(url_citation.title.clone()),
                                description: None,
                            },
                            content: String::new(),
                        });
                        processed_urls.insert(url.clone());
                    }
                }
            }
        }
    }

    if let Some(citations) = &completion_response.citations {
        eprintln!("Found {} citations from top-level field", citations.len());
        for citation_url in citations {
            eprintln!("Processing citation URL: {}", citation_url);

            if !processed_urls.contains(citation_url) {
                let title = extract_domain(citation_url);

                cited_sources.push(SearchSource {
                    metadata: crate::db::user_searches::SearchSourceMetadata {
                        url: citation_url.clone(),
                        title: Some(title),
                        description: Some(format!("Source cited by AI model")),
                    },
                    content: String::new(),
                });
                processed_urls.insert(citation_url.clone());
            }
        }
    }

    eprintln!(
        "Created {} cited sources from LLM response",
        cited_sources.len()
    );
    cited_sources
}

fn extract_domain(url: &str) -> String {
    if let Ok(parsed) = url::Url::parse(url) {
        if let Some(domain) = parsed.domain() {
            return domain.to_string();
        }
    }
    // Fallback for malformed URLs
    if let Some(start) = url.find("://") {
        let after_scheme = &url[start + 3..];
        if let Some(end) = after_scheme.find('/') {
            return after_scheme[..end].to_string();
        }
        return after_scheme.to_string();
    }
    url.to_string()
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
        format!("I couldn't find any accessible content for your search query '{}'. This might be because:\n• The URLs provided are not accessible\n• The content couldn't be scraped\n• No URLs were provided\n\nPlease try:\n• Checking that your URLs are correct and accessible\n• Using AI-enhanced search by selecting a model\n• Providing different URLs", query)
    } else {
        let source_summaries: Vec<String> = sources
            .iter()
            .map(|source| {
                let title = source.metadata.title.as_deref().unwrap_or("Untitled");
                let preview = source.content.chars().take(150).collect::<String>();
                let preview = if source.content.len() > 150 {
                    format!("{}...", preview)
                } else {
                    preview
                };
                format!("**{}** ({}): {}", title, source.metadata.url, preview)
            })
            .collect();

        format!(
            "Based on my search for '{}', I found the following information:\n\n{}",
            query,
            source_summaries.join("\n\n")
        )
    }
}
