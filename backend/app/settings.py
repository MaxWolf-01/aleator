from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    sqlalchemy_echo: bool
    db_auto_create: bool

    database_url: str
    cors_origins: list[str]
    
    # JWT settings
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30

    model_config = SettingsConfigDict(
        env_prefix="",
        env_file=".env",
        extra="ignore",
        env_nested_delimiter="__",
    )


def get_settings() -> Settings:
    return Settings()  # type: ignore
