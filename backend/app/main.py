import os
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection, db_instance
from app.routers.auth import router as auth_router
from app.routers.meetings import router as meetings_router
from app.routers.documents import router as documents_router
from app.routers.summaries import router as summaries_router
from app.routers.action_items import router as action_items_router
from app.routers.files_viewer import router as files_viewer_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure upload directories exist
    os.makedirs(settings.AUDIO_UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.PDF_UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.SUMMARY_UPLOAD_DIR, exist_ok=True)
    # Connect to MongoDB
    await connect_to_mongo()
    yield
    # Shutdown: Close MongoDB connection
    await close_mongo_connection()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="MeetMind AI - Enterprise Meeting Intelligence: Auth | Whisper Transcription | AI Summary | Action Items Management",
    lifespan=lifespan
)

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(meetings_router, prefix=settings.API_V1_PREFIX)
app.include_router(documents_router, prefix=settings.API_V1_PREFIX)
app.include_router(summaries_router, prefix=settings.API_V1_PREFIX)
app.include_router(action_items_router, prefix=settings.API_V1_PREFIX)
app.include_router(files_viewer_router, prefix=settings.API_V1_PREFIX)

@app.get("/", tags=["System"])
async def root():
    return {
        "system": "MeetMind AI",
        "modules": [
            "Module 1: User Authentication & User Management",
            "Module 2: Audio, Video & PDF File Upload Management (Whisper AI + pdfplumber + FFmpeg)"
        ],
        "status": "Active & Running",
        "docs_url": "/docs",
        "endpoints": {
            "auth": {
                "register": f"{settings.API_V1_PREFIX}/auth/register",
                "login": f"{settings.API_V1_PREFIX}/auth/login",
                "profile": f"{settings.API_V1_PREFIX}/auth/me",
                "update_profile": f"{settings.API_V1_PREFIX}/auth/profile",
                "change_password": f"{settings.API_V1_PREFIX}/auth/change-password",
                "logout": f"{settings.API_V1_PREFIX}/auth/logout"
            },
            "audio_video_meetings": {
                "upload": f"{settings.API_V1_PREFIX}/meetings/upload (MP3, WAV, M4A, MP4)",
                "demo_meeting": f"{settings.API_V1_PREFIX}/meetings/demo",
                "list_meetings": f"{settings.API_V1_PREFIX}/meetings",
                "get_meeting": f"{settings.API_V1_PREFIX}/meetings/{{meeting_id}}",
                "update_transcript": f"{settings.API_V1_PREFIX}/meetings/{{meeting_id}}/transcript",
                "delete_meeting": f"{settings.API_V1_PREFIX}/meetings/{{meeting_id}}",
                "stream_audio": f"{settings.API_V1_PREFIX}/meetings/audio/{{stored_filename}}"
            },
            "pdf_documents": {
                "upload": f"{settings.API_V1_PREFIX}/documents/upload (PDF)",
                "demo_document": f"{settings.API_V1_PREFIX}/documents/demo",
                "list_documents": f"{settings.API_V1_PREFIX}/documents",
                "get_document": f"{settings.API_V1_PREFIX}/documents/{{doc_id}}",
                "update_text": f"{settings.API_V1_PREFIX}/documents/{{doc_id}}/text",
                "delete_document": f"{settings.API_V1_PREFIX}/documents/{{doc_id}}",
                "download_pdf": f"{settings.API_V1_PREFIX}/documents/download/{{stored_filename}}",
                "stats": f"{settings.API_V1_PREFIX}/documents/stats"
            },
            "health": f"{settings.API_V1_PREFIX}/health"
        }
    }

@app.get(f"{settings.API_V1_PREFIX}/health", tags=["System"])
async def health_check():
    mongo_status = "Disconnected"
    if db_instance.client:
        try:
            await db_instance.client.admin.command("ping")
            mongo_status = "Connected"
        except Exception as e:
            mongo_status = f"Error: {str(e)}"
            
    return {
        "status": "healthy",
        "service": "MeetMind AI Core Engine",
        "version": settings.VERSION,
        "database": {
            "name": settings.DB_NAME,
            "status": mongo_status
        },
        "whisper": {
            "model": settings.WHISPER_MODEL,
            "engine": "OpenAI Whisper CPU"
        },
        "pdf_engine": {
            "primary": "pdfplumber",
            "fallback": "pypdf",
            "status": "Ready"
        },
        "audio_video_converter": {
            "engine": "FFmpeg 9.0",
            "supported": ["MP3", "WAV", "M4A", "MP4"]
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
