from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://river:river@localhost:5432/river_gauge"

    # Battery thresholds (mV) — easy to change
    battery_healthy_mv: int = 3700  # >= healthy
    battery_mid_mv: int = 3400      # >= mid, < healthy → mid; < mid → replace

    # SMTP (Gmail App Password recommended)
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    alert_from_name: str = "River Gauge Alerts"

    # Twilio SMS
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from_number: str = ""

    # App
    app_base_url: str = "http://localhost:3000"
    alert_cooldown_hours: int = 6

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()


def get_battery_state(battery_mv: int) -> str:
    if battery_mv >= settings.battery_healthy_mv:
        return "healthy"
    elif battery_mv >= settings.battery_mid_mv:
        return "mid"
    return "replace"
