use derive_more::From;
use std::fmt;

pub type Result<T> = core::result::Result<T, Error>;

#[derive(Debug, From)]
pub enum Error {
    Custom(String),
    #[from]
    ParseError(cdk::nuts::nut00::Error),
}

impl Error {
    pub fn custom(msg: &str) -> Self {
        Error::Custom(msg.to_string())
    }
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Error::Custom(msg) => write!(f, "Custom error: {}", msg),
            Error::ParseError(e) => write!(f, "Parse error: {}", e),
        }
    }
}

impl std::error::Error for Error {}
