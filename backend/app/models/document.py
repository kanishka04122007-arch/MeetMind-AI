from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class PDFPageDetail(BaseModel):
    page_number: int
    text: str
    word_count: int = 0
    char_count: int = 0

class PDFDocumentResponse(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    title: str
    fileName: str
    filename: Optional[str] = None
    stored_filename: Optional[str] = None
    file_url: Optional[str] = None
    file_size: int = 0
    page_count: int = 1
    word_count: int = 0
    char_count: int = 0
    status: str = "Uploaded"  # "Uploaded", "Extracted", "Processed", "Failed"
    uploadDate: str
    extracted_text: str = ""
    pages: List[PDFPageDetail] = []
    metadata: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    created_at: str
    updated_at: str

    class Config:
        populate_by_name = True

class PDFListItem(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    title: str
    fileName: str
    filename: Optional[str] = None
    file_size: int = 0
    page_count: int = 1
    word_count: int = 0
    status: str = "Uploaded"
    uploadDate: str
    text_preview: str = ""
    created_at: str

    class Config:
        populate_by_name = True

class PDFListResponse(BaseModel):
    documents: List[PDFListItem]
    total: int

class DemoPDFRequest(BaseModel):
    scenario: Optional[str] = "meeting_notes"  # "meeting_notes", "sprint_retro"
    title: Optional[str] = None

class UpdatePDFTextRequest(BaseModel):
    title: Optional[str] = None
    extracted_text: Optional[str] = None
