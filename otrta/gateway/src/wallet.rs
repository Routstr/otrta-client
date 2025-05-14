use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct WalletInfo {
    pub id: String,
    pub user_id: String,
    pub name: String,
    pub balance: f64,
    pub created_at: String,
    pub updated_at: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Transaction {
    pub id: String,
    pub wallet_id: String,
    pub amount: f64,
    pub transaction_type: TransactionType,
    pub status: TransactionStatus,
    pub created_at: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum TransactionType {
    #[serde(rename = "deposit")]
    Deposit,
    #[serde(rename = "withdrawal")]
    Withdrawal,
    #[serde(rename = "transfer")]
    Transfer,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum TransactionStatus {
    #[serde(rename = "pending")]
    Pending,
    #[serde(rename = "completed")]
    Completed,
    #[serde(rename = "failed")]
    Failed,
}

pub struct WalletService;

impl WalletService {
    pub async fn create_wallet(user_id: &str, name: &str) -> WalletInfo {
        WalletInfo {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: user_id.to_string(),
            name: name.to_string(),
            balance: 0.0,
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: None,
        }
    }

    pub async fn get_wallet(_wallet_id: &str) -> Option<WalletInfo> {
        Some(WalletInfo {
            id: "wallet_123".to_string(),
            user_id: "user_123".to_string(),
            name: "My Wallet".to_string(),
            balance: 100.0,
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: None,
        })
    }

    pub async fn process_transaction(
        _wallet_id: &str,
        _amount: f64,
        _transaction_type: TransactionType,
    ) -> Transaction {
        Transaction {
            id: uuid::Uuid::new_v4().to_string(),
            wallet_id: "wallet_123".to_string(),
            amount: 100.0,
            transaction_type: TransactionType::Deposit,
            status: TransactionStatus::Completed,
            created_at: chrono::Utc::now().to_rfc3339(),
        }
    }
}
