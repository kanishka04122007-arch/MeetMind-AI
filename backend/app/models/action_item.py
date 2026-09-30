from typing import List, Optional
from pydantic import BaseModel, Field

class ActionItemResponse(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    source_id: Optional[str] = None
    source_type: Optional[str] = "meeting"  # "meeting", "document", "manual"
    source_title: Optional[str] = "Meeting Session"
    task: str
    assigned_to: str = "Unassigned"
    deadline: str = "Next Sprint"
    priority: str = "Medium"  # "High", "Medium", "Low"
    status: str = "Pending"   # "Pending", "In Progress", "Completed"
    model_used: Optional[str] = "Groq LLaMA-3.3"
    created_at: str
    updated_at: str

    class Config:
        populate_by_name = True

class ExtractActionItemsRequest(BaseModel):
    source_id: str
    source_type: str = "meeting"  # "meeting" or "document"
    text: Optional[str] = None
    title: Optional[str] = None

class CreateActionItemRequest(BaseModel):
    task: str
    assigned_to: Optional[str] = "Unassigned"
    deadline: Optional[str] = "Next Sprint"
    priority: Optional[str] = "Medium"  # "High", "Medium", "Low"
    status: Optional[str] = "Pending"   # "Pending", "In Progress", "Completed"
    source_id: Optional[str] = None
    source_type: Optional[str] = "manual"
    source_title: Optional[str] = "Manual Task"

class UpdateActionItemRequest(BaseModel):
    task: Optional[str] = None
    assigned_to: Optional[str] = None
    deadline: Optional[str] = None
    priority: Optional[str] = None  # "High", "Medium", "Low"
    status: Optional[str] = None    # "Pending", "In Progress", "Completed"

class ActionItemListResponse(BaseModel):
    tasks: List[ActionItemResponse]
    total: int

class ActionItemStatsResponse(BaseModel):
    total_tasks: int = 0
    pending_tasks: int = 0
    in_progress_tasks: int = 0
    completed_tasks: int = 0
    high_priority_tasks: int = 0
    medium_priority_tasks: int = 0
    low_priority_tasks: int = 0
    completion_rate: float = 0.0  # Percentage completed
