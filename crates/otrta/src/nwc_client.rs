use nostr::nips::nip47::{MakeInvoiceRequest, PayInvoiceRequest};
use nwc::prelude::*;
use std::str::FromStr;
use std::sync::Arc;
use tokio::time::{sleep, timeout, Duration};
use tracing::{debug, error, info, warn};

use crate::db::nwc::NwcConnection;
use crate::error::AppError;
use crate::handlers::{check_lightning_payment_nwc, PaymentStatusResponse};
use crate::models::AppState;

pub struct NwcClient {
    client: NWC,
    connection_info: NwcConnection,
}

impl NwcClient {
    pub async fn new(connection: NwcConnection) -> Result<Self, AppError> {
        let uri = NostrWalletConnectURI::from_str(&connection.connection_uri).map_err(|e| {
            error!("Failed to parse NWC URI: {}", e);
            AppError::BadRequest("Invalid NWC connection URI".to_string())
        })?;

        let monitor = Monitor::new(100);
        let mut monitor_sub = monitor.subscribe();
        tokio::spawn(async move {
            while let Ok(notification) = monitor_sub.recv().await {
                println!("Notification: {notification:?}");
            }
        });

        let nwc: NWC = NWC::with_opts(uri, NostrWalletConnectOptions::default().monitor(monitor));

        let nwc_client = Self {
            client: nwc,
            connection_info: connection,
        };

        Ok(nwc_client)
    }

    pub async fn get_balance(&self) -> Result<u64, AppError> {
        let balance = timeout(Duration::from_secs(10), self.client.get_balance())
            .await
            .map_err(|_| {
                error!("NWC get_balance timed out");
                AppError::InternalServerError
            })?
            .map_err(|e| {
                error!("Failed to get balance from NWC wallet: {}", e);
                AppError::InternalServerError
            })?;

        Ok(balance)
    }

    pub async fn request_payment(
        &self,
        amount_msat: u64,
        description: &str,
    ) -> Result<String, AppError> {
        let request = MakeInvoiceRequest {
            amount: amount_msat,
            description: Some(description.to_string()),
            description_hash: None,
            expiry: None,
        };

        let response = timeout(Duration::from_secs(30), self.client.make_invoice(request))
            .await
            .map_err(|_| {
                error!("NWC make_invoice timed out");
                AppError::InternalServerError
            })?
            .map_err(|e| {
                error!("Failed to create invoice via NWC: {}", e);
                AppError::InternalServerError
            })?;

        info!("Created invoice via NWC: {} msat", amount_msat);
        Ok(response.invoice)
    }

    pub async fn pay_invoice(&self, invoice: &str) -> Result<String, AppError> {
        let request = PayInvoiceRequest::new(invoice);

        let response = timeout(Duration::from_secs(60), self.client.pay_invoice(request))
            .await
            .map_err(|_| {
                error!("NWC pay_invoice timed out");
                AppError::InternalServerError
            })?
            .map_err(|e| {
                error!("Failed to pay invoice via NWC: {}", e);
                AppError::InternalServerError
            })?;

        info!("Paid invoice via NWC. Preimage: {}", response.preimage);
        Ok(response.preimage)
    }

    pub fn connection_name(&self) -> &str {
        &self.connection_info.name
    }

    pub fn connection_id(&self) -> &uuid::Uuid {
        &self.connection_info.id
    }
}

pub struct NwcManager {
    db_pool: sqlx::PgPool,
}

impl NwcManager {
    pub fn new(db_pool: sqlx::PgPool) -> Self {
        Self { db_pool }
    }

    pub async fn get_client_for_connection(
        &self,
        connection_id: &uuid::Uuid,
        organization_id: &uuid::Uuid,
    ) -> Result<NwcClient, AppError> {
        let connection =
            crate::db::nwc::get_nwc_connection_by_id(&self.db_pool, connection_id, organization_id)
                .await?
                .ok_or_else(|| {
                    warn!("NWC connection not found: {}", connection_id);
                    AppError::NotFound
                })?;

        println!("connection: {:?}", connection);

        if !connection.is_active {
            warn!("NWC connection is inactive: {}", connection_id);
            return Err(AppError::BadRequest(
                "NWC connection is inactive".to_string(),
            ));
        }

        NwcClient::new(connection).await
    }

    pub async fn test_connection(&self, connection_uri: &str) -> Result<bool, AppError> {
        let uri = NostrWalletConnectURI::from_str(connection_uri).map_err(|e| {
            error!("Failed to parse NWC URI for testing: {}", e);
            AppError::BadRequest("Invalid NWC connection URI".to_string())
        })?;

        let monitor = Monitor::new(100);
        let mut monitor_sub = monitor.subscribe();

        let _nwc: NWC = NWC::with_opts(
            uri.clone(),
            NostrWalletConnectOptions::default().monitor(monitor),
        );

        let connection_result = timeout(Duration::from_secs(10), async {
            while let Ok(notification) = monitor_sub.recv().await {
                debug!("Notification: {notification:?}");
                let notification_str = format!("{:?}", notification);
                if notification_str.contains("status: Connected") {
                    return Ok::<bool, ()>(true);
                } else if notification_str.contains("status: Disconnected") {
                    return Ok::<bool, ()>(false);
                }
            }
            Ok::<bool, ()>(false)
        })
        .await;

        match connection_result {
            Ok(Ok(connected)) => {
                if connected {
                    info!("NWC connection test successful");
                } else {
                    warn!("NWC connection test failed - not connected");
                }
                Ok(connected)
            }
            Ok(Err(_)) => {
                error!("Error during NWC connection test");
                Ok(false)
            }
            Err(_) => {
                error!("NWC connection test timed out");
                Ok(false)
            }
        }
    }

    pub async fn request_mint_refill(
        &self,
        nwc_connection_id: &uuid::Uuid,
        organization_id: &uuid::Uuid,
        amount_msat: u64,
        mint_url: &str,
    ) -> Result<String, AppError> {
        let client = self
            .get_client_for_connection(nwc_connection_id, organization_id)
            .await?;

        let description = format!("Auto-refill for mint: {} ({}msat)", mint_url, amount_msat);
        client.request_payment(amount_msat, &description).await
    }

    pub async fn pay_invoice_with_connection(
        &self,
        state: &Arc<AppState>,
        nwc_connection_id: &uuid::Uuid,
        organization_id: &uuid::Uuid,
        invoice: &str,
        quote_id: &str,
        mint_url: &str,
    ) -> Result<String, AppError> {
        let connection = crate::db::nwc::get_nwc_connection_by_id(
            &self.db_pool,
            nwc_connection_id,
            organization_id,
        )
        .await?
        .ok_or_else(|| {
            warn!("NWC connection not found: {}", nwc_connection_id);
            AppError::NotFound
        })?;

        println!("{:?}", connection);
        let uri = NostrWalletConnectURI::from_str(&connection.connection_uri).map_err(|e| {
            error!("Failed to parse NWC URI for testing: {}", e);
            AppError::BadRequest("Invalid NWC connection URI".to_string())
        })?;

        let monitor = Monitor::new(100);

        let mut monitor_sub = monitor.subscribe();
        tokio::spawn(async move {
            while let Ok(notification) = monitor_sub.recv().await {
                println!("Notification: {notification:?}");
            }
        });

        let nwc: NWC = NWC::with_opts(
            uri.clone(),
            NostrWalletConnectOptions::default().monitor(monitor),
        );
        let request: PayInvoiceRequest = PayInvoiceRequest::new(invoice);
        let _ = nwc.pay_invoice(request).await.unwrap();

        for _ in [..10] {
            let response = check_lightning_payment_nwc(state, organization_id, quote_id, mint_url)
                .await
                .unwrap();
            if response.state == "PAID" {
                return Ok(response.state.clone());
            }
            sleep(Duration::from_secs(2)).await;
        }

        Err(AppError::NotFound)
    }
}
