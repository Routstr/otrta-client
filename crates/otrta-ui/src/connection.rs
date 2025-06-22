use secrecy::{ExposeSecret, SecretString};
use serde_aux::field_attributes::deserialize_number_from_string;
use sqlx::postgres::{PgConnectOptions, PgSslMode};
use std::convert::{TryFrom, TryInto};

#[derive(Debug, serde::Deserialize, Clone)]
pub struct Settings {
    pub database: DatabaseSettings,
    pub application: ApplicationSettings,
}

#[derive(Debug, serde::Deserialize, Clone)]
pub struct ApplicationSettings {
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub port: u16,
    pub host: String,
    pub default_msats_per_request: u32,
    pub mint_url: String,
}

#[derive(Debug, serde::Deserialize, Clone)]
pub struct DatabaseSettings {
    pub username: String,
    pub password: SecretString,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub port: u16,
    pub host: String,
    pub database_name: String,
    pub require_ssl: bool,
    pub connections: u32,
}

impl DatabaseSettings {
    pub fn without_db(&self) -> PgConnectOptions {
        let ssl_mode = if self.require_ssl {
            PgSslMode::Require
        } else {
            PgSslMode::Prefer
        };

        PgConnectOptions::new()
            .host(&self.host)
            .username(&self.username)
            .password(&self.password.expose_secret())
            .port(self.port)
            .ssl_mode(ssl_mode)
    }

    pub fn with_db(&self) -> PgConnectOptions {
        self.without_db().database(&self.database_name)
    }
}

pub fn get_configuration() -> Result<Settings, config::ConfigError> {
    let base_path = std::env::current_dir().expect("Failed to determine the current directory");
    println!("{:?}", std::env::current_dir());
    let configuration_directory = base_path.join("configuration");

    let environment: Environment = std::env::var("APP_ENVIRONMENT")
        .unwrap_or_else(|_| "local".into())
        .try_into()
        .expect("Failed to parse APP_ENVIRONMENT.");
    let environment_filename = format!("{}.yaml", environment.as_str());

    let settings = config::Config::builder()
        .add_source(config::File::from(
            configuration_directory.join("base.yaml"),
        ))
        .add_source(config::File::from(
            configuration_directory.join(environment_filename),
        ))
        .add_source(
            config::Environment::with_prefix("APP")
                .prefix_separator("_")
                .separator("__")
                .try_parsing(true)
                .ignore_empty(true),
        )
        .add_source(
            config::Environment::with_prefix("OTRTA")
                .prefix_separator("_")
                .separator("__")
                .try_parsing(true)
                .ignore_empty(true),
        )
        .add_source(
            config::Environment::default()
                .try_parsing(true)
                .ignore_empty(true)
                .source(Some({
                    let mut env_map = std::collections::HashMap::new();

                    if let Ok(val) = std::env::var("DB_HOST") {
                        env_map.insert("database__host".to_string(), val);
                    }
                    if let Ok(val) = std::env::var("DB_PORT") {
                        env_map.insert("database__port".to_string(), val);
                    }
                    if let Ok(val) = std::env::var("DB_USERNAME") {
                        env_map.insert("database__username".to_string(), val);
                    }
                    if let Ok(val) = std::env::var("DB_PASSWORD") {
                        env_map.insert("database__password".to_string(), val);
                    }
                    if let Ok(val) = std::env::var("DB_NAME") {
                        env_map.insert("database__database_name".to_string(), val);
                    }
                    if let Ok(val) = std::env::var("DB_REQUIRE_SSL") {
                        env_map.insert("database__require_ssl".to_string(), val);
                    }
                    if let Ok(val) = std::env::var("DB_CONNECTIONS") {
                        env_map.insert("database__connections".to_string(), val);
                    }

                    if let Ok(val) = std::env::var("PORT") {
                        env_map.insert("application__port".to_string(), val);
                    }
                    if let Ok(val) = std::env::var("HOST") {
                        env_map.insert("application__host".to_string(), val);
                    }
                    if let Ok(val) = std::env::var("MINT_URL") {
                        env_map.insert("application__mint_url".to_string(), val);
                    }
                    if let Ok(val) = std::env::var("DEFAULT_MSATS") {
                        env_map.insert("application__default_msats_per_request".to_string(), val);
                    }

                    env_map
                })),
        )
        .build()?;

    settings.try_deserialize::<Settings>()
}

pub enum Environment {
    Local,
    Production,
}

impl Environment {
    pub fn as_str(&self) -> &'static str {
        match self {
            Environment::Local => "local",
            Environment::Production => "production",
        }
    }
}

impl TryFrom<String> for Environment {
    type Error = String;

    fn try_from(s: String) -> Result<Self, Self::Error> {
        match s.to_lowercase().as_str() {
            "local" => Ok(Self::Local),
            "production" => Ok(Self::Production),
            other => Err(format!(
                "{} is not a supported environment. Use either `local` or `production`.",
                other
            )),
        }
    }
}
