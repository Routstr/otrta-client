use crate::{
    error::{Error, Result},
    models::SendTokenPendingResponse,
};
use std::{str::FromStr, sync::Arc};

use bip39::Mnemonic;
use cdk::wallet::{HttpClient, ReceiveOptions, SendOptions, Wallet, WalletBuilder};
use cdk_redb::WalletRedbDatabase;

pub fn prepare_seed(seed: &str) -> Result<[u8; 64]> {
    let mnemonic = Mnemonic::from_str(&seed).map_err(|_| Error::custom("Invalid mnemonic seed"))?;
    Ok(mnemonic.to_seed_normalized(""))
}

#[derive(Debug, Clone)]
pub struct CashuWalletClient {
    pub wallet: Wallet,
}

impl CashuWalletClient {
    pub fn from_seed(mint_url: &str, seed: &str) -> Result<Self> {
        let s = Mnemonic::from_str(seed).map_err(|_| Error::custom("Invalid mnemonic seed"))?;
        CashuWalletClient::wallet(mint_url, s)
    }

    pub fn new(mint_url: &str, seed: &mut String) -> Result<Self> {
        let s = Mnemonic::generate(12).map_err(|_| Error::custom("Failed to generate mnemonic"))?;
        seed.push_str(&s.to_string());
        CashuWalletClient::wallet(mint_url, s)
    }

    pub async fn send(&self, amount: u64) -> Result<String> {
        let options = SendOptions {
            include_fee: true,
            ..Default::default()
        };

        let prepared_send = self
            .wallet
            .prepare_send((amount as u64).into(), options)
            .await
            .unwrap();

        Ok(self
            .wallet
            .send(prepared_send, None)
            .await
            .unwrap()
            .to_string())
    }

    pub async fn receive(&self, token: &str) -> Result<String> {
        Ok(self
            .wallet
            .receive(token, ReceiveOptions::default())
            .await
            .unwrap()
            .to_string())
    }

    pub async fn balance(&self) -> Result<String> {
        Ok(self.wallet.total_balance().await.unwrap().to_string())
    }

    pub async fn pending(&self) -> Result<Vec<SendTokenPendingResponse>> {
        let proofs = self.wallet.get_pending_spent_proofs().await.unwrap();

        Ok(proofs
            .into_iter()
            .map(|proof| {
                SendTokenPendingResponse {
                    token: proof.secret.to_string(),
                    amount: proof.amount.to_string(), // Assuming Amount is a wrapper around u64
                    key: proof.c.to_string(),
                    key_id: proof.keyset_id.to_string(),
                }
            })
            .collect())
    }

    fn wallet(mint_url: &str, s: Mnemonic) -> Result<Self> {
        let home_dir =
            home::home_dir().ok_or_else(|| Error::custom("Could not determine home directory"))?;
        let localstore = WalletRedbDatabase::new(&home_dir.join("cdk_wallet_client.redb")).unwrap();

        let seed = s.to_seed_normalized("");
        let mint_url = cdk::mint_url::MintUrl::from_str(mint_url)
            .map_err(|_| Error::custom("Invalid mint URL"))?;
        let mut builder = WalletBuilder::new()
            .mint_url(mint_url.clone())
            .unit(cdk::nuts::CurrencyUnit::Msat)
            .localstore(Arc::new(localstore))
            .seed(&seed);
        let http_client = HttpClient::new(mint_url);
        builder = builder.client(http_client);

        Ok(Self {
            wallet: builder.build().unwrap(),
        })
    }

    pub async fn redeem_pendings(&self) -> Result<()> {
        let proofs = self.wallet.get_pending_spent_proofs().await.unwrap();
        self.wallet
            .receive_proofs(proofs, ReceiveOptions::default(), None)
            .await
            .unwrap();
        Ok(())
    }
}
