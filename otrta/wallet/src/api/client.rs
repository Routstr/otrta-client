use super::base::CashuWalletApi;
use super::models::*;
use anyhow::Result;
use reqwest::Client;

#[derive(Clone)]
pub struct CashuWalletClient {
    client: Client,
    base_url: String,
}

impl CashuWalletClient {
    pub fn new(base_url: &str) -> Self {
        Self {
            client: Client::new(),
            base_url: base_url.to_string(),
        }
    }
}

impl CashuWalletApi for CashuWalletClient {
    async fn pay_invoice(&self, bolt11: &str, mint: Option<&str>) -> Result<PaymentResponse> {
        let mut url = format!("{}/lightning/pay_invoice?bolt11={}", self.base_url, bolt11);
        if let Some(mint_url) = mint {
            url = format!("{}&mint={}", url, mint_url);
        }

        let response = self.client.post(&url).send().await?;
        Ok(response.json().await?)
    }

    async fn payment_state(
        &self,
        payment_hash: Option<&str>,
        mint: Option<&str>,
    ) -> Result<PaymentStatus> {
        let mut url = format!("{}/lightning/payment_state", self.base_url);

        if let Some(hash) = payment_hash {
            url = format!("{}?payment_hash={}", url, hash);
            if let Some(mint_url) = mint {
                url = format!("{}&mint={}", url, mint_url);
            }
        } else if let Some(mint_url) = mint {
            url = format!("{}?mint={}", url, mint_url);
        }

        let response = self.client.get(&url).send().await?;
        Ok(response.json().await?)
    }

    async fn create_invoice(&self, amount: i64, mint: Option<&str>) -> Result<InvoiceResponse> {
        let mut url = format!(
            "{}/lightning/create_invoice?amount={}",
            self.base_url, amount
        );
        if let Some(mint_url) = mint {
            url = format!("{}&mint={}", url, mint_url);
        }

        let response = self.client.post(&url).send().await?;
        Ok(response.json().await?)
    }

    async fn invoice_state(
        &self,
        payment_request: Option<&str>,
        mint: Option<&str>,
    ) -> Result<PaymentStatus> {
        let mut url = format!("{}/lightning/invoice_state", self.base_url);

        if let Some(req) = payment_request {
            url = format!("{}?payment_request={}", url, req);
            if let Some(mint_url) = mint {
                url = format!("{}&mint={}", url, mint_url);
            }
        } else if let Some(mint_url) = mint {
            url = format!("{}?mint={}", url, mint_url);
        }

        let response = self.client.get(&url).send().await?;
        Ok(response.json().await?)
    }

    async fn lightning_balance(&self) -> Result<StatusResponse> {
        let url = format!("{}/lightning/balance", self.base_url);
        let response = self.client.get(&url).send().await?;
        Ok(response.json().await?)
    }

    async fn swap(
        &self,
        amount: i64,
        outgoing_mint: &str,
        incoming_mint: &str,
    ) -> Result<SwapResponse> {
        let url = format!(
            "{}/swap?amount={}&outgoing_mint={}&incoming_mint={}",
            self.base_url, amount, outgoing_mint, incoming_mint
        );

        let response = self.client.post(&url).send().await?;
        Ok(response.json().await?)
    }

    async fn balance(&self) -> Result<BalanceResponse> {
        let url = format!("{}/balance", self.base_url);
        let response = self.client.get(&url).send().await?;
        Ok(response.json().await?)
    }

    async fn send(
        &self,
        amount: i64,
        nostr: Option<&str>,
        lock: Option<&str>,
        mint: Option<&str>,
        offline: Option<bool>,
    ) -> Result<SendResponse> {
        let mut url = format!("{}/send?amount={}", self.base_url, amount);

        if let Some(nostr_key) = nostr {
            url = format!("{}&nostr={}", url, nostr_key);
        }

        if let Some(lock_key) = lock {
            url = format!("{}&lock={}", url, lock_key);
        }

        if let Some(mint_url) = mint {
            url = format!("{}&mint={}", url, mint_url);
        }

        if let Some(true) = offline {
            url = format!("{}&offline=true", url);
        }

        let response = self.client.post(&url).send().await?;
        Ok(response.json().await?)
    }

    async fn receive(
        &self,
        token: Option<&str>,
        nostr: Option<bool>,
        all: Option<bool>,
    ) -> Result<ReceiveResponse> {
        let mut url = format!("{}/receive", self.base_url);
        let mut has_param = true;

        if let Some(token_str) = token {
            url = format!("{}?token={}", url, token_str);
            has_param = true;
        }

        if let Some(true) = nostr {
            if has_param {
                url = format!("{}&nostr=true", url);
            } else {
                url = format!("{}?nostr=false", url);
                has_param = true;
            }
        }

        if let Some(true) = all {
            if has_param {
                url = format!("{}&all=true", url);
            } else {
                url = format!("{}?all=false", url);
            }
        }

        let response = self.client.post(&url).send().await?;
        Ok(response.json().await?)
    }

    async fn burn(
        &self,
        token: Option<&str>,
        all: Option<bool>,
        force: Option<bool>,
        delete: Option<&str>,
        mint: Option<&str>,
    ) -> Result<BurnResponse> {
        let mut url = format!("{}/burn", self.base_url);
        let mut has_param = false;

        if let Some(token_str) = token {
            url = format!("{}?token={}", url, token_str);
            has_param = true;
        }

        if let Some(true) = all {
            if has_param {
                url = format!("{}&all=true", url);
            } else {
                url = format!("{}?all=true", url);
                has_param = true;
            }
        }

        if let Some(true) = force {
            if has_param {
                url = format!("{}&force=true", url);
            } else {
                url = format!("{}?force=true", url);
                has_param = true;
            }
        }

        if let Some(del_id) = delete {
            if has_param {
                url = format!("{}&delete={}", url, del_id);
            } else {
                url = format!("{}?delete={}", url, del_id);
                has_param = true;
            }
        }

        if let Some(mint_url) = mint {
            if has_param {
                url = format!("{}&mint={}", url, mint_url);
            } else {
                url = format!("{}?mint={}", url, mint_url);
            }
        }

        let response = self.client.post(&url).send().await?;
        Ok(response.json().await?)
    }

    async fn pending(&self, number: Option<i64>, offset: Option<i64>) -> Result<PendingResponse> {
        let mut url = format!("{}/pending", self.base_url);
        let mut has_param = false;

        if let Some(num) = number {
            url = format!("{}?number={}", url, num);
            has_param = true;
        }

        if let Some(off) = offset {
            if has_param {
                url = format!("{}&offset={}", url, off);
            } else {
                url = format!("{}?offset={}", url, off);
            }
        }

        let response = self.client.get(&url).send().await?;
        Ok(response.json().await?)
    }

    async fn lock(&self) -> Result<LockResponse> {
        let url = format!("{}/lock", self.base_url);
        let response = self.client.get(&url).send().await?;
        Ok(response.json().await?)
    }

    async fn locks(&self) -> Result<LocksResponse> {
        let url = format!("{}/locks", self.base_url);
        let response = self.client.get(&url).send().await?;
        Ok(response.json().await?)
    }

    async fn invoices(&self) -> Result<InvoicesResponse> {
        let url = format!("{}/invoices", self.base_url);
        let response = self.client.get(&url).send().await?;
        Ok(response.json().await?)
    }

    async fn wallets(&self) -> Result<WalletsResponse> {
        let url = format!("{}/wallets", self.base_url);
        let response = self.client.get(&url).send().await?;
        Ok(response.json().await?)
    }

    async fn restore(&self, to: i64) -> Result<RestoreResponse> {
        let url = format!("{}/v1/restore?to={}", self.base_url, to);
        let response = self.client.post(&url).send().await?;
        Ok(response.json().await?)
    }

    async fn info(&self) -> Result<InfoResponse> {
        let url = format!("{}/info", self.base_url);
        let response = self.client.get(&url).send().await?;
        Ok(response.json().await?)
    }
}
