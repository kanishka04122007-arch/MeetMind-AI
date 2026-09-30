from typing import List, Optional
from pydantic import BaseModel, Field

class SummaryActionItem(BaseModel):
    task: str
    owner: Optional[str] = "Unassigned"
    deadline: Optional[str] = "Not specified"
    status: Optional[str] = "Pending"

class StructuredSummaryData(BaseModel):
    overview: str
    key_points: List[str] = []
    decisions: List[str] = []
    action_items: List[SummaryActionItem] = []
    next_steps: List[str] = []

class SummaryResponse(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    source_id: str
    source_type: str  # "meeting" or "document"
    source_title: str
    summary_text: str  # Full markdown representation
    structured_data: StructuredSummaryData
    original_word_count: int = 0
    summary_word_count: int = 0
    compression_ratio: float = 0.0  # Percentage reduced
    reading_time_saved_mins: float = 0.0
    model_used: str = "Groq LLaMA-3.3"
    style: str = "executive"  # "executive", "detailed", "action_focused"
    created_at: str
    updated_at: str

    class Config:
        populate_by_name = True

class SummaryListItem(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    source_id: str
    source_type: str
    source_title: str
    original_word_count: int = 0
    summary_word_count: int = 0
    compression_ratio: float = 0.0
    reading_time_saved_mins: float = 0.0
    model_used: str = "Groq LLaMA-3.3"
    style: str = "executive"
    overview_preview: str = ""
    created_at: str

    class Config:
        populate_by_name = True

class SummaryListResponse(BaseModel):
    summaries: List[SummaryListItem]
    total: int

class GenerateSummaryRequest(BaseModel):
    source_id: str
    source_type: str  # "meeting" or "document"
    text: Optional[str] = None
    title: Optional[str] = None
    style: Optional[str] = "executive"  # "executive", "detailed", "action_focused"

class SummaryStatsResponse(BaseModel):
    total_summaries: int = 0
    total_original_words: int = 0
    total_summary_words: int = 0
    avg_compression_ratio: float = 0.0
    total_reading_time_saved_mins: float = 0.0
