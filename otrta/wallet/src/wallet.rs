use crate::error::Result;
use std::{str::FromStr, sync::Arc};

use bip39::Mnemonic;
use cdk::wallet::{HttpClient, ReceiveOptions, SendOptions, Wallet, WalletBuilder};
use cdk_redb::WalletRedbDatabase;

pub fn prepare_seed(seed: &str) -> [u8; 64] {
    Mnemonic::from_str(&seed).unwrap().to_seed_normalized("")
}

pub struct CashuWalletClient {
    pub wallet: Wallet,
}

impl CashuWalletClient {
    pub fn new(mint_url: &str, seed: Option<&str>) -> Self {
        let home_dir = home::home_dir().unwrap();
        let localstore = WalletRedbDatabase::new(&home_dir.join("cdk_wallet.redb")).unwrap();
        let s = Mnemonic::generate(12).unwrap();
        println!("{}", s);
        let seed = s.to_seed_normalized("");
        let mint_url = cdk::mint_url::MintUrl::from_str(mint_url).unwrap();
        let mut builder = WalletBuilder::new()
            .mint_url(mint_url.clone())
            .unit(cdk::nuts::CurrencyUnit::Sat)
            .localstore(Arc::new(localstore))
            .seed(&seed);
        let http_client = HttpClient::new(mint_url);
        builder = builder.client(http_client);

        Self {
            wallet: builder.build().unwrap(),
        }
    }

    pub async fn send(&self, amount: u64) -> Result<String> {
        let prepared_send = self
            .wallet
            .prepare_send((amount as u64).into(), SendOptions::default())
            .await?;
        Ok(self.wallet.send(prepared_send, None).await?.to_string())
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
        Ok(self.wallet.total_balance().await?.to_string())
    }

    pub async fn pending(&self) -> Result<String> {
        let pendings = self.wallet.get_pending_spent_proofs().await?;
        println!("{:?}", pendings);
        Ok("test".to_string())
    }
}
