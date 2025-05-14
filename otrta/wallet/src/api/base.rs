use super::models::*;
use anyhow::Result;

pub trait CashuWalletApi {
    fn pay_invoice(
        &self,
        bolt11: &str,
        mint: Option<&str>,
    ) -> impl Future<Output = Result<PaymentResponse>>;

    fn payment_state(
        &self,
        payment_hash: Option<&str>,
        mint: Option<&str>,
    ) -> impl Future<Output = Result<PaymentStatus>>;

    fn create_invoice(
        &self,
        amount: i64,
        mint: Option<&str>,
    ) -> impl Future<Output = Result<InvoiceResponse>>;

    fn invoice_state(
        &self,
        payment_request: Option<&str>,
        mint: Option<&str>,
    ) -> impl Future<Output = Result<PaymentStatus>>;

    fn lightning_balance(&self) -> impl Future<Output = Result<StatusResponse>>;

    fn swap(
        &self,
        amount: i64,
        outgoing_mint: &str,
        incoming_mint: &str,
    ) -> impl Future<Output = Result<SwapResponse>>;

    fn balance(&self) -> impl Future<Output = Result<BalanceResponse>>;

    fn send(
        &self,
        amount: i64,
        nostr: Option<&str>,
        lock: Option<&str>,
        mint: Option<&str>,
        offline: Option<bool>,
    ) -> impl Future<Output = Result<SendResponse>>;

    fn receive(
        &self,
        token: Option<&str>,
        nostr: Option<bool>,
        all: Option<bool>,
    ) -> impl Future<Output = Result<ReceiveResponse>>;

    fn burn(
        &self,
        token: Option<&str>,
        all: Option<bool>,
        force: Option<bool>,
        delete: Option<&str>,
        mint: Option<&str>,
    ) -> impl Future<Output = Result<BurnResponse>>;

    fn pending(
        &self,
        number: Option<i64>,
        offset: Option<i64>,
    ) -> impl Future<Output = Result<PendingResponse>>;

    fn lock(&self) -> impl Future<Output = Result<LockResponse>>;
    fn locks(&self) -> impl Future<Output = Result<LocksResponse>>;

    fn invoices(&self) -> impl Future<Output = Result<InvoicesResponse>>;

    fn wallets(&self) -> impl Future<Output = Result<WalletsResponse>>;

    fn restore(&self, to: i64) -> impl Future<Output = Result<RestoreResponse>>;

    fn info(&self) -> impl Future<Output = Result<InfoResponse>>;
}
