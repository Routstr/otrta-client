use std::env;
use std::time::Duration;

use cdk::Amount;
use cdk::amount::SplitTarget;
use cdk::nuts::MintQuoteState;
use cdk::nuts::nut00::ProofsMethods;
use cdk::wallet::SendOptions;
use tokio::time::sleep;
use wallet::wallet::wallet;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let words = env::var("OTRTA_SEED").unwrap();

    let mint_url = "https://testnut.cashu.space";
    let wallet = wallet(mint_url, &words);

    let amount = Amount::from(1000);
    let quote = wallet.mint_quote(amount, None).await?;

    println!("Pay request: {}", quote.request);

    let timeout = Duration::from_secs(60); // Set a timeout duration
    let start = std::time::Instant::now();

    loop {
        let status = wallet.mint_quote_state(&quote.id).await?;

        if status.state == MintQuoteState::Paid {
            break;
        }

        if start.elapsed() >= timeout {
            eprintln!("Timeout while waiting for mint quote to be paid");
            return Err("Timeout while waiting for mint quote to be paid".into());
        }

        println!("Quote state: {}", status.state);

        sleep(Duration::from_secs(5)).await;
    }

    // Mint the received amount
    let proofs = wallet.mint(&quote.id, SplitTarget::default(), None).await?;
    let receive_amount = proofs.total_amount()?;
    println!("{:?}", receive_amount);
    println!("{:?}", wallet.get_mint_info().await.unwrap());
    println!("{:?}", wallet.total_balance().await.unwrap());
    println!("{:?}", wallet.total_pending_balance().await.unwrap());
    println!("{:?}", wallet.total_reserved_balance().await.unwrap());

    // Send the token
    let prepared_send = wallet.prepare_send(amount, SendOptions::default()).await?;
    let token = wallet.send(prepared_send, None).await?;

    println!("{}", token);

    Ok(())
}
