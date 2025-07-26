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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SearchRequest {
    pub message: String,
    pub group_id: String,
    pub conversation: Option<Vec<ConversationEntry>>,
    pub urls: Option<Vec<String>>,
    pub model_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConversationEntry {
    pub human: String,
    pub assistant: String,
}

fn handle_completion_response(
    completion_response: crate::completion::ChatCompletionResponse,
    sources: &mut Vec<SearchSource>,
    query: &str,
) -> String {
    eprintln!("Successfully parsed LLM completion response");

    // Map citations from the LLM response back to our sources
    let cited_sources = map_citations_to_sources(&completion_response, sources);
    *sources = cited_sources;

    // Handle the response content
    if let Some(choice) = completion_response.choices.first() {
        if choice.message.content.trim().is_empty() {
            eprintln!("LLM returned empty content, but this might be valid. Checking if we have sources...");
            if sources.is_empty() {
                eprintln!("No sources and empty content, falling back to basic search");
                generate_search_response(query, sources)
            } else {
                eprintln!("Have sources but empty content, using basic search with sources");
                generate_search_response(query, sources)
            }
        } else {
            eprintln!(
                "LLM returned valid content: {} chars",
                choice.message.content.len()
            );
            choice.message.content.clone()
        }
    } else {
        eprintln!("No choices in LLM response, falling back to basic search");
        generate_search_response(query, sources)
    }
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
    eprintln!("=== Starting web search with LLM ===");
    eprintln!("Query: {}", query);
    eprintln!("Model ID: {:?}", model_id);
    eprintln!("Organization ID: {}", organization_id);
    eprintln!("User ID: {:?}", user_id);
    eprintln!("URLs provided: {:?}", urls);
    eprintln!(
        "Conversation entries: {}",
        conversation.map_or(0, |c| c.len())
    );

    let client = Client::new();
    let mut sources = Vec::new();

    if let Some(url_list) = urls {
        eprintln!("Scraping {} URLs for sources", url_list.len());
        for url in url_list {
            eprintln!("Attempting to scrape URL: {}", url);
            match scrape_url(&client, &url).await {
                Ok(content) => {
                    eprintln!(
                        "Successfully scraped URL: {} (content length: {})",
                        url,
                        content.len()
                    );
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
        eprintln!(
            "URL scraping completed. Total sources gathered: {}",
            sources.len()
        );
    } else {
        eprintln!("No URLs provided for scraping");
    }

    let response_message = if let Some(model) = model_id {
        eprintln!("Processing search with model: {}", model);
        eprintln!("Sources available for completion: {}", sources.len());

        let completion_request = create_search_completion_request(
            model,
            query,
            conversation,
            if sources.is_empty() {
                eprintln!("No sources provided to completion request");
                None
            } else {
                eprintln!("Providing {} sources to completion request", sources.len());
                Some(&sources)
            },
        );

        eprintln!("Completion request created, making API call...");
        let headers = axum::http::HeaderMap::new();
        eprintln!("About to call forward_request_with_payment_with_body...");

        let response = forward_request_with_payment_with_body(
            headers,
            state,
            "v1/chat/completions",
            Some(completion_request),
            true,
            None,                  // api_key_id
            Some(organization_id), // organization_id
            user_id,
            crate::db::transaction::TransactionType::Chat,
        )
        .await;

        eprintln!("API call completed, received response");
        let status = response.status();
        eprintln!("LLM request status: {}", status);

        // Always fall back to basic search for any non-OK status
        if status != axum::http::StatusCode::OK {
            eprintln!(
                "LLM request failed with status: {}, falling back to basic search",
                status
            );
            generate_search_response(query, &sources)
        } else {
            eprintln!("LLM request succeeded with status 200, processing response body...");
            match axum::body::to_bytes(response.into_body(), usize::MAX).await {
                Ok(bytes) => {
                    eprintln!(
                        "Successfully read response body, {} bytes received",
                        bytes.len()
                    );

                    if bytes.is_empty() {
                        eprintln!("WARNING: Response body is empty despite 200 status!");
                        eprintln!(
                            "This might indicate a server-side issue or body already consumed"
                        );
                        generate_search_response(query, &sources)
                    } else {
                        eprintln!(
                            "Raw response bytes (first 200 chars): {:?}",
                            &bytes[..std::cmp::min(200, bytes.len())]
                        );

                        let response_text = String::from_utf8_lossy(&bytes);
                        eprintln!("Response text length: {}", response_text.len());
                        eprintln!(
                            "Response text (first 500 chars): {}",
                            &response_text[..std::cmp::min(500, response_text.len())]
                        );

                        if response_text.trim().is_empty() {
                            eprintln!("WARNING: Response text is empty or only whitespace!");
                            generate_search_response(query, &sources)
                        } else {
                            eprintln!("Processing non-empty response...");

                            // Try to parse as JSON first to check for structured errors
                            if let Ok(json_value) =
                                serde_json::from_str::<serde_json::Value>(&response_text)
                            {
                                eprintln!("Successfully parsed response as JSON");
                                // Check for actual error structure, not just string matching
                                if json_value.get("error").is_some() {
                                    eprintln!(
                                        "Structured error found in LLM response: {}",
                                        json_value.get("error").unwrap()
                                    );
                                    generate_search_response(query, &sources)
                                } else if let Some(error_type) =
                                    json_value.get("type").and_then(|v| v.as_str())
                                {
                                    eprintln!("Found type field in response: {}", error_type);
                                    if error_type == "payment_error" {
                                        eprintln!("Payment error detected in LLM response");
                                        generate_search_response(query, &sources)
                                    } else {
                                        eprintln!("Non-payment error type, attempting to parse as completion...");
                                        // Try to parse as completion response
                                        match serde_json::from_str::<
                                            crate::completion::ChatCompletionResponse,
                                        >(
                                            &response_text
                                        ) {
                                            Ok(completion_response) => {
                                                eprintln!(
                                                    "Successfully parsed as ChatCompletionResponse"
                                                );
                                                handle_completion_response(
                                                    completion_response,
                                                    &mut sources,
                                                    query,
                                                )
                                            }
                                            Err(parse_err) => {
                                                eprintln!(
                                                    "Failed to parse as ChatCompletionResponse: {}",
                                                    parse_err
                                                );
                                                eprintln!("Raw response was: {}", response_text);
                                                generate_search_response(query, &sources)
                                            }
                                        }
                                    }
                                } else {
                                    eprintln!("No error or type field found, attempting to parse as completion...");
                                    // Try to parse as completion response
                                    match serde_json::from_str::<
                                        crate::completion::ChatCompletionResponse,
                                    >(&response_text)
                                    {
                                        Ok(completion_response) => {
                                            eprintln!(
                                                "Successfully parsed as ChatCompletionResponse"
                                            );
                                            handle_completion_response(
                                                completion_response,
                                                &mut sources,
                                                query,
                                            )
                                        }
                                        Err(parse_err) => {
                                            eprintln!(
                                                "Failed to parse as ChatCompletionResponse: {}",
                                                parse_err
                                            );
                                            eprintln!("Raw response was: {}", response_text);
                                            generate_search_response(query, &sources)
                                        }
                                    }
                                }
                            } else {
                                eprintln!(
                                    "Response is not valid JSON, falling back to basic search"
                                );
                                eprintln!("Raw response was: {}", response_text);
                                generate_search_response(query, &sources)
                            }
                        }
                    }
                }
                Err(e) => {
                    eprintln!(
                        "Failed to read LLM response body: {}, falling back to basic search",
                        e
                    );
                    eprintln!("Error type: {:?}", e);
                    eprintln!(
                        "This could indicate a network issue, timeout, or body consumption problem"
                    );
                    generate_search_response(query, &sources)
                }
            }
        }
    } else {
        eprintln!("No model specified, using basic search response");
        generate_search_response(query, &sources)
    };

    eprintln!("=== Search completed ===");
    eprintln!("Final response message length: {}", response_message.len());
    eprintln!("Final sources count: {}", sources.len());
    eprintln!(
        "Response message preview: {}",
        &response_message[..std::cmp::min(200, response_message.len())]
    );

    Ok(SearchResponse {
        message: response_message,
        sources: if sources.is_empty() {
            eprintln!("Returning response with no sources");
            None
        } else {
            eprintln!("Returning response with {} sources", sources.len());
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
