import os
import uuid
import subprocess
import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse
from bson import ObjectId

from app.config import settings
from app.database import get_meetings_collection, get_transcripts_collection, get_files_collection
from app.dependencies import get_current_user
from app.models.meeting import (
    MeetingResponse,
    MeetingListItem,
    MeetingListResponse,
    TranscriptUpdateRequest,
    DemoMeetingRequest
)
from app.services.transcription_service import transcribe_audio_file, get_demo_meeting_data

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/meetings", tags=["Meeting Audio & Video Upload (Module 2)"])

ALLOWED_AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".mp4", ".ogg", ".webm", ".flac", ".aac"}
VIDEO_EXTENSIONS = {".mp4", ".webm", ".mkv"}

def extract_audio_from_mp4(video_path: str, audio_output_path: str) -> bool:
    """
    Extracts high-clarity 16kHz mono audio from MP4/video recordings using FFmpeg.
    This fulfills the Module 2 requirement for Zoom, Google Meet, and Teams MP4 recordings.
    """
    try:
        cmd = [
            "ffmpeg",
            "-y",
            "-i", video_path,
            "-vn",
            "-acodec", "libmp3lame",
            "-ar", "16000",
            "-ac", "1",
            "-q:a", "2",
            audio_output_path
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return os.path.exists(audio_output_path) and os.path.getsize(audio_output_path) > 0
    except Exception as e:
        logger.warning(f"FFmpeg audio extraction notice ({e}). Whisper AI can also decode container audio directly.")
        return False

def format_meeting_doc(doc: dict) -> dict:
    file_name = doc.get("fileName") or doc.get("filename") or "meeting_recording"
    upload_date = doc.get("uploadDate") or (str(doc.get("created_at", ""))[:10] if doc.get("created_at") else datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    return {
        "_id": str(doc["_id"]),
        "user_id": str(doc.get("user_id", "")),
        "title": doc.get("title", "Untitled Meeting"),
        "filename": file_name,
        "fileName": file_name,
        "file_url": doc.get("file_url"),
        "file_type": doc.get("file_type", "audio/recording"),
        "is_video": doc.get("is_video", False),
        "extracted_audio_url": doc.get("extracted_audio_url"),
        "file_size": doc.get("file_size", 0),
        "duration": doc.get("duration", 0.0),
        "status": doc.get("status", "Uploaded"),
        "uploadDate": upload_date,
        "language": doc.get("language", "en"),
        "transcript_text": doc.get("transcript_text", ""),
        "segments": doc.get("segments", []),
        "error_message": doc.get("error_message"),
        "created_at": str(doc.get("created_at", "")),
        "updated_at": str(doc.get("updated_at", ""))
    }

@router.post(
    "/upload",
    response_model=MeetingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload meeting audio/video (MP3, WAV, M4A, MP4) and transcribe using Whisper"
)
async def upload_meeting_audio(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    # Validate extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext == ".pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PDF files must be uploaded via the Meeting Documents (PDF) module (/api/documents/upload)."
        )
        
    if file_ext not in ALLOWED_AUDIO_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{file_ext}'. Allowed formats: MP3, WAV, M4A, MP4 (Google Meet, Zoom, MS Teams recordings). Image formats like .jpg or .png are rejected."
        )
    
    # Ensure audio uploads directory exists
    os.makedirs(settings.AUDIO_UPLOAD_DIR, exist_ok=True)
    
    # Save file to disk
    meeting_id = str(uuid.uuid4())
    stored_filename = f"{meeting_id}{file_ext}"
    saved_file_path = os.path.join(settings.AUDIO_UPLOAD_DIR, stored_filename)
    
    try:
        content = await file.read()
        file_size = len(content)
        
        if file_size > settings.MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_BYTES // (1024*1024)}MB."
            )
            
        with open(saved_file_path, "wb") as f:
            f.write(content)
        print("Audio uploaded successfully", flush=True)
        logger.info(f"Audio uploaded successfully: {file.filename} (size: {file_size} bytes, id: {meeting_id})")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error saving audio/video file: {e}", flush=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save audio/video file: {str(e)}"
        )

    is_video = file_ext in VIDEO_EXTENSIONS
    extracted_audio_filename = None
    transcribe_target_path = saved_file_path

    # If MP4, extract audio using FFmpeg as required by project specification
    if is_video:
        extracted_audio_filename = f"{meeting_id}_extracted.mp3"
        extracted_audio_path = os.path.join(settings.AUDIO_UPLOAD_DIR, extracted_audio_filename)
        success = extract_audio_from_mp4(saved_file_path, extracted_audio_path)
        if success:
            transcribe_target_path = extracted_audio_path
            logger.info(f"FFmpeg extracted audio successfully for MP4: {extracted_audio_filename}")

    clean_title = (title or "").strip()
    if not clean_title:
        base_name = os.path.splitext(file.filename)[0]
        clean_title = base_name.replace("_", " ").replace("-", " ").capitalize()

    # Transcribe audio using Whisper
    try:
        transcription_result = await transcribe_audio_file(transcribe_target_path)
        transcript_text = (transcription_result.get("transcript_text") or "").strip()
        print("Transcript generated successfully", flush=True)
        logger.info(f"Transcript generated successfully for '{file.filename}' using Whisper")
    except Exception as e:
        print(f"Error during audio transcription: {e}", flush=True)
        import traceback
        traceback.print_exc()
        transcription_result = {"transcript_text": "", "duration": 0.0, "language": "en", "segments": [], "success": False, "error": str(e)}
        transcript_text = ""
    
    now_dt = datetime.now(timezone.utc)
    now_iso = now_dt.isoformat()
    upload_date = now_dt.strftime("%Y-%m-%d")
    
    file_stream_url = f"{settings.API_V1_PREFIX}/meetings/audio/{stored_filename}"
    extracted_stream_url = f"{settings.API_V1_PREFIX}/meetings/audio/{extracted_audio_filename}" if extracted_audio_filename else None

    # Save to MongoDB files collection (Module 1 Requirement)
    files_col = get_files_collection()
    file_record = {
        "_id": meeting_id,
        "file_id": meeting_id,
        "file_name": file.filename,
        "fileName": file.filename,
        "file_type": "audio",
        "fileType": "audio",
        "uploaded_at": now_iso,
        "uploadedAt": now_iso,
        "status": "Completed" if transcription_result.get("success") else "Failed",
        "user_id": str(current_user["_id"])
    }
    await files_col.replace_one({"file_id": meeting_id}, file_record, upsert=True)
    print("Saved to MongoDB", flush=True)
    logger.info(f"Saved to MongoDB: Stored file metadata into 'files' collection (file_id='{meeting_id}')")

    # Save transcript into MongoDB meetmind_ai.transcripts collection (Module 2 Requirement)
    transcripts_col = get_transcripts_collection()
    transcript_record = {
        "_id": meeting_id,
        "file_id": meeting_id,
        "file_name": file.filename,
        "fileName": file.filename,
        "transcript": transcript_text,
        "text": transcript_text,
        "created_at": now_iso,
        "createdAt": now_iso,
        "user_id": str(current_user["_id"])
    }
    await transcripts_col.replace_one({"file_id": meeting_id}, transcript_record, upsert=True)
    print("Saved to MongoDB", flush=True)
    logger.info(f"Saved to MongoDB: Stored transcript into 'transcripts' collection (file_id='{meeting_id}')")

    # Save to MongoDB meetings collection (for frontend player compatibility)
    meeting_doc = {
        "_id": meeting_id,
        "user_id": str(current_user["_id"]),
        "title": clean_title,
        "fileName": file.filename,
        "filename": file.filename,
        "file_type": "video/mp4" if is_video else f"audio/{file_ext.lstrip('.')}",
        "is_video": is_video,
        "stored_filename": stored_filename,
        "extracted_audio_filename": extracted_audio_filename,
        "file_path": saved_file_path,
        "file_url": file_stream_url,
        "extracted_audio_url": extracted_stream_url or file_stream_url,
        "file_size": file_size,
        "duration": transcription_result.get("duration", 0.0),
        "status": "Uploaded" if transcription_result.get("success") else "Failed",
        "uploadDate": upload_date,
        "language": transcription_result.get("language", "en"),
        "transcript_text": transcript_text,
        "segments": transcription_result.get("segments", []),
        "error_message": transcription_result.get("error"),
        "created_at": now_iso,
        "updated_at": now_iso
    }
    meetings_col = get_meetings_collection()
    await meetings_col.replace_one({"_id": meeting_id}, meeting_doc, upsert=True)

    return format_meeting_doc(meeting_doc)

@router.post(
    "/demo",
    response_model=MeetingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a realistic sample meeting transcript for demonstration"
)
async def create_demo_meeting(
    request: DemoMeetingRequest,
    current_user: dict = Depends(get_current_user)
):
    demo_data = get_demo_meeting_data(request.scenario or "sprint_planning", request.title)
    meeting_id = str(uuid.uuid4())
    now_dt = datetime.now(timezone.utc)
    now_iso = now_dt.isoformat()
    upload_date = now_dt.strftime("%Y-%m-%d")
    
    meeting_doc = {
        "_id": meeting_id,
        "user_id": str(current_user["_id"]),
        "title": demo_data["title"],
        "fileName": demo_data["filename"],
        "filename": demo_data["filename"],
        "file_type": "audio/mp3",
        "is_video": False,
        "stored_filename": None,
        "extracted_audio_filename": None,
        "file_path": None,
        "file_url": None,
        "extracted_audio_url": None,
        "file_size": 2048576,  # ~2MB simulated
        "duration": demo_data["duration"],
        "status": "Uploaded",
        "uploadDate": upload_date,
        "language": demo_data["language"],
        "transcript_text": demo_data["transcript_text"],
        "segments": demo_data["segments"],
        "error_message": None,
        "created_at": now_iso,
        "updated_at": now_iso
    }

    meetings_col = get_meetings_collection()
    await meetings_col.insert_one(meeting_doc)
    logger.info(f"MongoDB save successful: Saved demo meeting metadata into 'meetings' collection with id='{meeting_id}'")

    # Save demo transcript into transcripts collection as well
    transcripts_col = get_transcripts_collection()
    demo_transcript_record = {
        "_id": meeting_id,
        "file_id": meeting_id,
        "filename": demo_data["filename"],
        "text": demo_data["transcript_text"],
        "createdAt": now_iso,
        "user_id": str(current_user["_id"])
    }
    await transcripts_col.replace_one({"file_id": meeting_id}, demo_transcript_record, upsert=True)
    logger.info(f"MongoDB save successful: Saved demo transcript into 'transcripts' collection for file_id='{meeting_id}'")

    return format_meeting_doc(meeting_doc)

@router.get(
    "",
    response_model=MeetingListResponse,
    summary="List all meetings/recordings for current authenticated user"
)
async def list_meetings(current_user: dict = Depends(get_current_user)):
    meetings_col = get_meetings_collection()
    cursor = meetings_col.find({"user_id": str(current_user["_id"])}).sort("created_at", -1)
    
    meetings = []
    async for doc in cursor:
        preview = doc.get("transcript_text", "")
        if len(preview) > 120:
            preview = preview[:117] + "..."
            
        file_name = doc.get("fileName") or doc.get("filename") or "meeting_recording"
        upload_date = doc.get("uploadDate") or (str(doc.get("created_at", ""))[:10] if doc.get("created_at") else "")
        
        meetings.append(MeetingListItem(
            _id=str(doc["_id"]),
            user_id=str(doc.get("user_id", "")),
            title=doc.get("title", "Untitled Meeting"),
            filename=file_name,
            fileName=file_name,
            file_size=doc.get("file_size", 0),
            file_type=doc.get("file_type", "audio/recording"),
            is_video=doc.get("is_video", False),
            duration=doc.get("duration", 0.0),
            status=doc.get("status", "Uploaded"),
            uploadDate=upload_date,
            language=doc.get("language", "en"),
            transcript_preview=preview,
            segment_count=len(doc.get("segments", [])),
            created_at=str(doc.get("created_at", ""))
        ))
        
    return MeetingListResponse(meetings=meetings, total=len(meetings))

@router.get(
    "/{meeting_id}",
    response_model=MeetingResponse,
    summary="Get full meeting transcript details"
)
async def get_meeting(
    meeting_id: str,
    current_user: dict = Depends(get_current_user)
):
    meetings_col = get_meetings_collection()
    doc = await meetings_col.find_one({
        "_id": meeting_id,
        "user_id": str(current_user["_id"])
    })
    
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found or you do not have permission to view it."
        )
        
    return format_meeting_doc(doc)

@router.put(
    "/{meeting_id}/transcript",
    response_model=MeetingResponse,
    summary="Update meeting transcript text or segments"
)
async def update_meeting_transcript(
    meeting_id: str,
    payload: TranscriptUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    meetings_col = get_meetings_collection()
    doc = await meetings_col.find_one({
        "_id": meeting_id,
        "user_id": str(current_user["_id"])
    })
    
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found or you do not have permission to edit it."
        )

    update_fields = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if payload.title is not None and payload.title.strip():
        update_fields["title"] = payload.title.strip()
    if payload.transcript_text is not None:
        update_fields["transcript_text"] = payload.transcript_text.strip()
    if payload.segments is not None:
        update_fields["segments"] = [seg.model_dump() for seg in payload.segments]

    await meetings_col.update_one(
        {"_id": meeting_id},
        {"$set": update_fields}
    )

    if payload.transcript_text is not None:
        transcripts_col = get_transcripts_collection()
        await transcripts_col.update_one(
            {"file_id": meeting_id},
            {"$set": {"text": payload.transcript_text.strip(), "updatedAt": update_fields["updated_at"]}},
            upsert=True
        )
        logger.info(f"MongoDB save successful: Updated transcript in 'transcripts' collection for file_id='{meeting_id}'")

    updated_doc = await meetings_col.find_one({"_id": meeting_id})
    return format_meeting_doc(updated_doc)

@router.delete(
    "/{meeting_id}",
    summary="Delete a meeting record and its audio/video file"
)
async def delete_meeting(
    meeting_id: str,
    current_user: dict = Depends(get_current_user)
):
    meetings_col = get_meetings_collection()
    doc = await meetings_col.find_one({
        "_id": meeting_id,
        "user_id": str(current_user["_id"])
    })
    
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found or you do not have permission to delete it."
        )
        
    # Remove original file from disk
    file_path = doc.get("file_path")
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass

    # Remove extracted audio file if it was created
    extracted_fn = doc.get("extracted_audio_filename")
    if extracted_fn:
        extracted_path = os.path.join(settings.AUDIO_UPLOAD_DIR, extracted_fn)
        if os.path.exists(extracted_path):
            try:
                os.remove(extracted_path)
            except Exception:
                pass

    await meetings_col.delete_one({"_id": meeting_id})
    transcripts_col = get_transcripts_collection()
    await transcripts_col.delete_one({"file_id": meeting_id})
    logger.info(f"MongoDB save successful: Deleted meeting and transcript for file_id='{meeting_id}'")

    return {"message": "Meeting deleted successfully", "meeting_id": meeting_id}

@router.get(
    "/audio/{stored_filename}",
    summary="Stream uploaded meeting audio/video file"
)
async def stream_audio_file(stored_filename: str):
    file_path = os.path.join(settings.AUDIO_UPLOAD_DIR, stored_filename)
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audio/video file not found on server."
        )
    return FileResponse(file_path)
