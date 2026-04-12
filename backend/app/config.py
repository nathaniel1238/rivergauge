from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://river:river@localhost:5432/river_gauge"

    # Battery thresholds (mV) — easy to change
    battery_healthy_mv: int = 3700  # >= healthy
    battery_mid_mv: int = 3400      # >= mid, < healthy → mid; < mid → replace

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()


def get_battery_state(battery_mv: int) -> str:
    if battery_mv >= settings.battery_healthy_mv:
        return "healthy"
    elif battery_mv >= settings.battery_mid_mv:
        return "mid"
    return "replace"
