from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    sqlalchemy_echo: bool
    db_auto_create: bool

    database_url: str
    cors_origins: list[str]

    model_config = SettingsConfigDict(
        env_prefix="",
        env_file=".env",
        extra="ignore",
        env_nested_delimiter="__",
    )


def get_settings() -> Settings:
    return Settings()  # type: ignore
