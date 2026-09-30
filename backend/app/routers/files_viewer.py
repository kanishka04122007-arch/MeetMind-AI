from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from app.database import (
    get_files_collection,
    get_extracted_text_collection,
    get_transcripts_collection
)
from app.dependencies import get_current_user

router = APIRouter(tags=["Core Files & Extracted Text Collections (Modules 1 & 2)"])

@router.get("/files", summary="List all uploaded files from files collection (Module 1)")
async def list_files(current_user: dict = Depends(get_current_user)):
    col = get_files_collection()
    cursor = col.find({"user_id": str(current_user["_id"])}).sort("uploaded_at", -1)
    docs = await cursor.to_list(length=100)
    for d in docs:
        d["_id"] = str(d["_id"])
    return {"files": docs, "total": len(docs)}

@router.get("/extracted-text/{file_id}", summary="Get extracted text for a PDF file from extracted_text collection (Module 2)")
async def get_extracted_text(file_id: str, current_user: dict = Depends(get_current_user)):
    col = get_extracted_text_collection()
    doc = await col.find_one({"$or": [{"file_id": file_id}, {"_id": file_id}]})
    if not doc:
        raise HTTPException(status_code=404, detail=f"No extracted text found for file_id '{file_id}'.")
    doc["_id"] = str(doc["_id"])
    return {
        "file_id": doc.get("file_id") or str(doc["_id"]),
        "file_name": doc.get("file_name") or doc.get("fileName") or "document.pdf",
        "text": doc.get("text", ""),
        "created_at": doc.get("created_at") or doc.get("createdAt") or ""
    }

@router.get("/transcripts/{file_id}", summary="Get transcript for an audio file from transcripts collection (Module 2)")
async def get_transcript(file_id: str, current_user: dict = Depends(get_current_user)):
    col = get_transcripts_collection()
    doc = await col.find_one({"$or": [{"file_id": file_id}, {"_id": file_id}]})
    if not doc:
        raise HTTPException(status_code=404, detail=f"No transcript found for file_id '{file_id}'.")
    doc["_id"] = str(doc["_id"])
    return {
        "file_id": doc.get("file_id") or str(doc["_id"]),
        "file_name": doc.get("file_name") or doc.get("fileName") or "meeting.mp3",
        "transcript": doc.get("transcript") or doc.get("text", ""),
        "created_at": doc.get("created_at") or doc.get("createdAt") or ""
    }
