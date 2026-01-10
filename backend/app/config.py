from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Union
import json


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "Miq2 API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "postgresql://miq2:miq2_secret@localhost:5432/miq2"
    
    # JWT
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS - accepts "*" for all origins or a JSON array of origins
    CORS_ORIGINS_RAW: str = '["http://localhost:3000", "http://localhost:5173"]'
    
    @property
    def CORS_ORIGINS(self) -> list[str]:
        """Parse CORS origins from raw string. Supports '*' for all origins."""
        raw = self.CORS_ORIGINS_RAW
        if raw == "*":
            return ["*"]
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return ["http://localhost:3000", "http://localhost:5173"]
    
    # Evolution API (WhatsApp)
    EVOLUTION_API_URL: str = "http://evolution-api:8080"
    EVOLUTION_API_KEY: str = "miq2-evolution-default-key"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
