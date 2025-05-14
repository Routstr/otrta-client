use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Debug)]
pub struct HTTPValidationError {
    pub detail: Vec<ValidationError>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ValidationError {
    pub loc: Vec<String>,
    pub msg: String,
    pub r#type: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PaymentResponse {
    pub result: PaymentResult,
    pub checking_id: Option<String>,
    pub fee: Option<Amount>,
    pub preimage: Option<String>,
    pub error_message: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub enum PaymentResult {
    #[serde(rename = "1")]
    Success = 1,
    #[serde(rename = "2")]
    Failed = 2,
    #[serde(rename = "3")]
    Pending = 3,
    #[serde(rename = "4")]
    Unknown = 4,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Amount {
    pub unit: Unit,
    pub amount: i64,
}

#[derive(Serialize, Deserialize, Debug)]
pub enum Unit {
    #[serde(rename = "0")]
    Sat = 0,
    #[serde(rename = "1")]
    Msat = 1,
    #[serde(rename = "2")]
    BTC = 2,
    #[serde(rename = "3")]
    USD = 3,
    #[serde(rename = "4")]
    EUR = 4,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PaymentStatus {
    pub result: PaymentResult,
    pub fee: Option<Amount>,
    pub preimage: Option<String>,
    pub error_message: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct InvoiceResponse {
    pub ok: bool,
    pub checking_id: Option<String>,
    pub payment_request: Option<String>,
    pub error_message: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct StatusResponse {
    pub balance: f64,
    pub error_message: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct BalanceResponse {
    pub balance: i64,
    pub keysets: Option<HashMap<String, serde_json::Value>>,
    pub mints: Option<HashMap<String, serde_json::Value>>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SendResponse {
    pub balance: i64,
    pub token: String,
    pub npub: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ReceiveResponse {
    pub initial_balance: i64,
    pub balance: i64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct BurnResponse {
    pub balance: i64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PendingResponse {
    pub pending_token: HashMap<String, serde_json::Value>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct LockResponse {
    pub p2pk: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct LocksResponse {
    pub locks: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct BlindedMessage {
    pub amount: i64,
    pub id: String,
    pub witness: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct DLEQ {
    pub e: String,
    pub s: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct BlindedSignature {
    pub id: String,
    pub amount: i64,
    pub dleq: Option<DLEQ>,
}

#[derive(Serialize, Deserialize, Debug)]
pub enum MintQuoteState {
    UNPAID,
    PAID,
    PENDING,
    ISSUED,
}

#[derive(Serialize, Deserialize, Debug)]
pub enum MeltQuoteState {
    UNPAID,
    PENDING,
    PAID,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct MintQuote {
    pub quote: String,
    pub method: String,
    pub request: String,
    pub checking_id: String,
    pub unit: String,
    pub amount: i64,
    pub state: MintQuoteState,
    pub created_time: i64,
    pub paid_time: Option<i64>,
    pub expiry: Option<i64>,
    pub mint: Option<String>,
    pub privkey: Option<String>,
    pub pubkey: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct MeltQuote {
    pub quote: String,
    pub method: String,
    pub request: String,
    pub checking_id: String,
    pub unit: String,
    pub amount: i64,
    pub fee_reserve: i64,
    pub state: MeltQuoteState,
    pub created_time: i64,
    pub paid_time: Option<i64>,
    pub fee_paid: Option<i64>,
    pub payment_preimage: Option<String>,
    pub expiry: Option<i64>,
    pub outputs: Option<Vec<BlindedMessage>>,
    pub change: Option<Vec<BlindedSignature>>,
    pub mint: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct InvoicesResponse {
    pub mint_quotes: Vec<MintQuote>,
    pub melt_quotes: Vec<MeltQuote>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct WalletsResponse {
    pub wallets: HashMap<String, serde_json::Value>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct RestoreResponse {
    pub balance: i64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SwapResponse {
    pub outgoing_mint: String,
    pub incoming_mint: String,
    pub mint_quote: MintQuote,
    pub balances: HashMap<String, serde_json::Value>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct InfoResponse {
    pub version: String,
    pub wallet: String,
    pub debug: bool,
    pub cashu_dir: String,
    pub mint_urls: Vec<String>,
    pub settings: Option<String>,
    pub tor: bool,
    pub nostr_public_key: Option<String>,
    pub nostr_relays: Vec<String>,
    pub socks_proxy: Option<String>,
}
