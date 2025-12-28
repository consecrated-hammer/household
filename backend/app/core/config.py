from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DatabaseUrl: str = "postgresql+psycopg2://budget:budget@db:5432/budget"
    JwtSecretKey: str = "change-me"
    JwtAlgorithm: str = "HS256"
    AccessTokenTtlMinutes: int = 15
    RefreshTokenTtlDays: int = 30
    AllowedOrigins: str = "http://localhost:5173,http://127.0.0.1:5173"
    FinancialYearStartMonth: int = 7
    FinancialYearStartDay: int = 1
    LogLevel: str = "INFO"
    LogFilePath: str = "./logs/app.log"
    LogMaxBytes: int = 5_000_000
    LogBackupCount: int = 5
    LogJsonEnabled: bool = False
    AutheliaEnabled: bool = True
    AutheliaHeaderEmail: str = "Remote-Email"
    AutheliaHeaderUser: str = "Remote-User"
    AutheliaFallbackDomain: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
