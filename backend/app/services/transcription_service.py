import os
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Any, List, Optional
import whisper
from app.config import settings

logger = logging.getLogger("uvicorn.error")

_executor = ThreadPoolExecutor(max_workers=2)
_whisper_model = None

def get_whisper_model():
    """Lazy load Whisper model once and keep in memory"""
    global _whisper_model
    if _whisper_model is None:
        model_name = getattr(settings, "WHISPER_MODEL", "tiny")
        logger.info(f"Loading Whisper model '{model_name}' into memory...")
        _whisper_model = whisper.load_model(model_name)
        logger.info(f"Whisper model '{model_name}' loaded successfully.")
    return _whisper_model

def _transcribe_sync(audio_path: str) -> Dict[str, Any]:
    """Synchronous CPU transcription using Whisper"""
    model = get_whisper_model()
    # fp16=False for CPU execution
    result = model.transcribe(audio_path, fp16=False, verbose=False)
    return result

async def transcribe_audio_file(audio_path: str) -> Dict[str, Any]:
    """Run transcription in thread pool to avoid blocking async event loop"""
    loop = asyncio.get_running_loop()
    try:
        result = await loop.run_in_executor(_executor, _transcribe_sync, audio_path)
        
        raw_segments = result.get("segments", [])
        formatted_segments: List[Dict[str, Any]] = []
        
        current_speaker_id = 1
        last_end = 0.0
        
        for idx, seg in enumerate(raw_segments):
            start = round(float(seg.get("start", 0.0)), 2)
            end = round(float(seg.get("end", 0.0)), 2)
            text = seg.get("text", "").strip()
            
            # Simple heuristic speaker turn detection: if pause is > 1.8 seconds, toggle speaker
            if idx > 0 and (start - last_end) > 1.8:
                current_speaker_id = 2 if current_speaker_id == 1 else 1
            last_end = end
            
            formatted_segments.append({
                "id": idx + 1,
                "start": start,
                "end": end,
                "text": text,
                "speaker": f"Speaker {current_speaker_id}"
            })
            
        full_text = result.get("text", "").strip()
        detected_language = result.get("language", "en")
        duration = formatted_segments[-1]["end"] if formatted_segments else 0.0
        
        return {
            "success": True,
            "transcript_text": full_text,
            "language": detected_language,
            "duration": duration,
            "segments": formatted_segments
        }
    except Exception as e:
        logger.error(f"Whisper transcription failed for {audio_path}: {e}")
        return {
            "success": False,
            "error": str(e),
            "transcript_text": "",
            "language": "en",
            "duration": 0.0,
            "segments": []
        }

def get_demo_meeting_data(scenario: str = "sprint_planning", custom_title: Optional[str] = None) -> Dict[str, Any]:
    """Generates realistic structured meeting transcripts for testing & demonstration"""
    scenarios = {
        "sprint_planning": {
            "title": custom_title or "MeetMind AI - Sprint 4 Planning & Architecture Sync",
            "filename": "meetmind_sprint4_sync.mp3",
            "duration": 184.5,
            "language": "en",
            "segments": [
                {
                    "id": 1,
                    "start": 0.0,
                    "end": 14.2,
                    "text": "Good morning team, let's kick off our Sprint 4 planning session for MeetMind AI.",
                    "speaker": "Kanishka (Project Lead)"
                },
                {
                    "id": 2,
                    "start": 14.5,
                    "end": 35.8,
                    "text": "In Module 1, we achieved 100% test coverage on user authentication, bcrypt password hashing, and MongoDB session security. Everything is operating solidly.",
                    "speaker": "Kanishka (Project Lead)"
                },
                {
                    "id": 3,
                    "start": 36.2,
                    "end": 58.4,
                    "text": "Awesome. For Module 2, our top priority is speech-to-text transcription. We're integrating OpenAI Whisper to process audio streams and output timestamped segments.",
                    "speaker": "Alex (ML Engineer)"
                },
                {
                    "id": 4,
                    "start": 59.0,
                    "end": 85.0,
                    "text": "I've benchmarked Whisper on CPU. The tiny and base models transcribe multi-minute meeting recordings in under 10 seconds, which gives us smooth real-time response times.",
                    "speaker": "Alex (ML Engineer)"
                },
                {
                    "id": 5,
                    "start": 85.6,
                    "end": 112.3,
                    "text": "On the frontend, I've designed the interactive audio player. Users can upload MP3 or WAV files, or record directly with their microphone. Clickable timestamps jump immediately to that point in audio.",
                    "speaker": "Sarah (Frontend Lead)"
                },
                {
                    "id": 6,
                    "start": 113.0,
                    "end": 140.5,
                    "text": "That's great. What about MongoDB schema for transcripts? We should store the meeting document with segments, user ID, status, and duration.",
                    "speaker": "David (Backend Dev)"
                },
                {
                    "id": 7,
                    "start": 141.0,
                    "end": 165.2,
                    "text": "Yes, David, the schema is already indexed by user ID and timestamp. Next sprint we will feed these transcripts into Module 3 for LLM summarization and action items.",
                    "speaker": "Kanishka (Project Lead)"
                },
                {
                    "id": 8,
                    "start": 165.8,
                    "end": 184.5,
                    "text": "Agreed. Let's finalize this build, run the integration tests, and review the live dashboard.",
                    "speaker": "Kanishka (Project Lead)"
                }
            ]
        },
        "product_roadmap": {
            "title": custom_title or "MeetMind AI - Q4 Product Roadmap & Feature Prioritization",
            "filename": "q4_product_roadmap_discussion.wav",
            "duration": 145.0,
            "language": "en",
            "segments": [
                {
                    "id": 1,
                    "start": 0.0,
                    "end": 18.5,
                    "text": "Welcome everyone. Today we are reviewing user feedback from our initial meeting transcription beta tests.",
                    "speaker": "Priya (Product Manager)"
                },
                {
                    "id": 2,
                    "start": 19.0,
                    "end": 45.2,
                    "text": "Users love the live audio recording feature and segment timestamps. The highest requested feature is automated executive summary generation and exporting to PDF.",
                    "speaker": "Priya (Product Manager)"
                },
                {
                    "id": 3,
                    "start": 46.0,
                    "end": 78.6,
                    "text": "We can leverage our Gemini integration to produce bulleted takeaways, key decisions made, and assigned owners with target deadlines.",
                    "speaker": "Liam (AI Solutions)"
                },
                {
                    "id": 4,
                    "start": 79.2,
                    "end": 115.0,
                    "text": "Let's also ensure users can edit transcripts directly in the UI in case technical jargon or acronyms need manual correction.",
                    "speaker": "Priya (Product Manager)"
                },
                {
                    "id": 5,
                    "start": 115.5,
                    "end": 145.0,
                    "text": "Done. The inline editing API is ready. Let's proceed with the rollout plan.",
                    "speaker": "Liam (AI Solutions)"
                }
            ]
        },
        "technical_architecture": {
            "title": custom_title or "MeetMind AI - Database Scaling & Performance Architecture",
            "filename": "tech_architecture_review.m4a",
            "duration": 120.0,
            "language": "en",
            "segments": [
                {
                    "id": 1,
                    "start": 0.0,
                    "end": 22.0,
                    "text": "Let's review the persistence tier for audio transcripts and meeting intelligence.",
                    "speaker": "Marcus (Lead Architect)"
                },
                {
                    "id": 2,
                    "start": 22.5,
                    "end": 56.4,
                    "text": "MongoDB handles our flexible schema cleanly. We store full transcript text for full-text search indexing, and nested arrays for segment timestamps.",
                    "speaker": "Elena (Data Platform Lead)"
                },
                {
                    "id": 3,
                    "start": 57.0,
                    "end": 90.2,
                    "text": "Audio files are saved under uploads directory with unique GUID names, and served securely through FastAPI static or streaming endpoints.",
                    "speaker": "Marcus (Lead Architect)"
                },
                {
                    "id": 4,
                    "start": 91.0,
                    "end": 120.0,
                    "text": "Excellent design. The security interceptors ensure users can only access meetings they own.",
                    "speaker": "Elena (Data Platform Lead)"
                }
            ]
        }
    }
    
    selected = scenarios.get(scenario, scenarios["sprint_planning"])
    full_text = " ".join([seg["text"] for seg in selected["segments"]])
    
    return {
        "title": selected["title"],
        "filename": selected["filename"],
        "duration": selected["duration"],
        "language": selected["language"],
        "transcript_text": full_text,
        "segments": selected["segments"]
    }
