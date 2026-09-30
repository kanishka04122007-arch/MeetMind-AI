import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "MeetMind AI - Meeting Intelligence Platform"
    VERSION: str = "2.0.0"
    API_V1_PREFIX: str = "/api"
    
    # MongoDB Config
    MONGO_URI: str = "mongodb://localhost:27017"
    DB_NAME: str = "meetmind_ai"
    
    # JWT Config
    JWT_SECRET: str = "meetmind_ai_super_secret_jwt_key_2026_secure_dsa_project"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    
    # Audio & Video Upload Config (MP3, WAV, M4A, MP4)
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    UPLOAD_DIR: str = os.path.join(BASE_DIR, "uploads")
    AUDIO_UPLOAD_DIR: str = os.path.join(BASE_DIR, "uploads", "audio")
    PDF_UPLOAD_DIR: str = os.path.join(BASE_DIR, "uploads", "pdf")
    MAX_FILE_SIZE_BYTES: int = 100 * 1024 * 1024  # 100 MB for Audio/Video
    MAX_PDF_SIZE_BYTES: int = 50 * 1024 * 1024   # 50 MB for PDF
    WHISPER_MODEL: str = "tiny"  # fast on CPU, can also use 'base'
    
    ALLOWED_AUDIO_EXTENSIONS: tuple = (".mp3", ".wav", ".m4a", ".mp4", ".ogg", ".webm", ".flac", ".aac")
    ALLOWED_PDF_EXTENSIONS: tuple = (".pdf",)
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    # Module 3: AI Summary Config (Google Gemini Primary / Local NLP Backup)
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.8-flash"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    SUMMARY_UPLOAD_DIR: str = os.path.join(BASE_DIR, "uploads", "summaries")

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
