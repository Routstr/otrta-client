use crate::{
    db::{
        transaction::{add_transaction, TransactionDirection},
        Pool,
    },
    multimint::{LocalMultimintSendOptions, MultimintWalletWrapper},
};

#[derive(Debug)]
pub enum SendAmoundResponse {
    Error(String),
}

pub async fn send_with_retry(
    wallet: &MultimintWalletWrapper,
    amount: i64,
    mint_url: &str,
    retries: Option<i32>,
    db: &Pool,
    api_key_id: Option<&str>,
) -> Result<String, SendAmoundResponse> {
    let retry_count = retries.unwrap_or(3);

    for _ in 0..retry_count {
        let option = LocalMultimintSendOptions {
            preferred_mint: Some(mint_url.to_string()),
            ..Default::default()
        };

        if let Ok(token_result) = wallet.send(amount as u64, option, db, api_key_id).await {
            return Ok(token_result);
        }
    }

    Err(SendAmoundResponse::Error(
        "wallet: failed to generate token".to_string(),
    ))
}

pub async fn finalize_request(
    db: &Pool,
    wallet: &MultimintWalletWrapper,
    token_send: &str,
    sats_send: i64,
    token_received: &str,
) {
    if let Ok(res) = wallet.receive(token_received).await {
        add_transaction(
            &db,
            token_send,
            &sats_send.to_string(),
            TransactionDirection::Outgoing,
            None,
        )
        .await
        .unwrap();

        add_transaction(
            &db,
            token_received,
            &res.to_string(),
            TransactionDirection::Incoming,
            None,
        )
        .await
        .unwrap();
    }
}
