from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

class TranscriptSegment(BaseModel):
    id: int
    start: float
    end: float
    text: str
    speaker: Optional[str] = "Speaker 1"

class MeetingResponse(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    title: str
    filename: Optional[str] = None
    fileName: Optional[str] = None
    file_url: Optional[str] = None
    file_type: Optional[str] = "audio"
    is_video: Optional[bool] = False
    extracted_audio_url: Optional[str] = None
    file_size: Optional[int] = 0
    duration: Optional[float] = 0.0
    status: str = "completed"  # "Uploaded", "completed", "failed"
    uploadDate: Optional[str] = None
    language: Optional[str] = "en"
    transcript_text: str = ""
    segments: List[TranscriptSegment] = []
    error_message: Optional[str] = None
    created_at: str
    updated_at: str

    class Config:
        populate_by_name = True

class MeetingListItem(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    title: str
    filename: Optional[str] = None
    fileName: Optional[str] = None
    file_size: Optional[int] = 0
    file_type: Optional[str] = "audio"
    is_video: Optional[bool] = False
    duration: Optional[float] = 0.0
    status: str = "completed"
    uploadDate: Optional[str] = None
    language: Optional[str] = "en"
    transcript_preview: str = ""
    segment_count: int = 0
    created_at: str

    class Config:
        populate_by_name = True

class MeetingListResponse(BaseModel):
    meetings: List[MeetingListItem]
    total: int

class TranscriptUpdateRequest(BaseModel):
    title: Optional[str] = None
    transcript_text: Optional[str] = None
    segments: Optional[List[TranscriptSegment]] = None

class DemoMeetingRequest(BaseModel):
    scenario: Optional[str] = "sprint_planning" # "sprint_planning", "product_roadmap", "technical_architecture"
    title: Optional[str] = None
