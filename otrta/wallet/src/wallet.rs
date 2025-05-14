use std::{str::FromStr, sync::Arc};

use bip39::Mnemonic;
use cashu::MintUrl;
use cdk::wallet::{HttpClient, Wallet, WalletBuilder};
use cdk_redb::WalletRedbDatabase;

pub fn prepare_seed(seed: &str) -> [u8; 64] {
    Mnemonic::from_str(&seed).unwrap().to_seed_normalized("")
}

pub fn wallet(mint_url: &str, _seed: &str) -> Wallet {
    // let seed = prepare_seed(seed);
    let rand = rand::random::<[u8; 32]>();
    let file = tempfile::NamedTempFile::new().unwrap();
    let redb_store = Arc::new(WalletRedbDatabase::new(file.path()).unwrap());

    let mint_url = MintUrl::from_str(mint_url).unwrap();
    let mut builder = WalletBuilder::new()
        .mint_url(mint_url.clone())
        .unit(cdk::nuts::CurrencyUnit::Sat)
        .localstore(redb_store.clone())
        .seed(&rand);

    let http_client = HttpClient::new(mint_url, None);
    builder = builder.client(http_client);

    builder.build().unwrap()
}
