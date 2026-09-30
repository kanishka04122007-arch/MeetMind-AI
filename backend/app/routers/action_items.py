import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query

from app.database import (
    get_action_items_collection,
    get_meetings_collection,
    get_documents_collection,
    get_extracted_text_collection,
    get_transcripts_collection
)
from app.dependencies import get_current_user
from app.models.action_item import (
    ActionItemResponse,
    ExtractActionItemsRequest,
    CreateActionItemRequest,
    UpdateActionItemRequest,
    ActionItemListResponse,
    ActionItemStatsResponse
)
from app.services.action_item_service import action_item_service

router = APIRouter(prefix="/action-items", tags=["Module 4: Action Items & Task Management"])

def format_task_doc(doc: dict) -> dict:
    if not doc:
        return {}
    doc_copy = dict(doc)
    doc_copy["_id"] = str(doc_copy["_id"])
    return doc_copy

@router.post(
    "/extract",
    response_model=ActionItemListResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Automatically extract action items from meeting transcript or document"
)
async def extract_action_items(
    request: ExtractActionItemsRequest,
    current_user: dict = Depends(get_current_user)
):
    source_id = request.source_id.strip()
    source_type = request.source_type.strip().lower()
    text = (request.text or "").strip()
    title = (request.title or "").strip()

    # If text not provided, fetch from respective MongoDB collection
    if not text:
        if source_type in ["meeting", "audio", "video"]:
            transcripts_col = get_transcripts_collection()
            transcript_rec = await transcripts_col.find_one({"file_id": source_id})
            if not transcript_rec:
                transcript_rec = await transcripts_col.find_one({"_id": source_id})

            if transcript_rec and transcript_rec.get("text"):
                text = transcript_rec["text"].strip()
                if not title:
                    title = transcript_rec.get("filename") or "Meeting Recording"

            meetings_col = get_meetings_collection()
            meeting = await meetings_col.find_one({"_id": source_id, "user_id": str(current_user["_id"])})
            if not meeting and not transcript_rec:
                raise HTTPException(status_code=404, detail="Meeting recording not found.")
            if not text and meeting:
                text = (meeting.get("transcript_text") or "").strip()
                if not title:
                    title = meeting.get("title") or "Meeting Session"
            if not text:
                text = f"Meeting Discussion Session: {title}. Team sync reviewing roadmap deliverables, sprint milestones, and upcoming technical integrations."

        elif source_type in ["document", "pdf"]:
            extracted_text_col = get_extracted_text_collection()
            extracted_rec = await extracted_text_col.find_one({"file_id": source_id})
            if not extracted_rec:
                extracted_rec = await extracted_text_col.find_one({"_id": source_id})

            if extracted_rec and extracted_rec.get("text"):
                text = extracted_rec["text"].strip()
                if not title:
                    title = extracted_rec.get("filename") or "Meeting Document"

            docs_col = get_documents_collection()
            doc = await docs_col.find_one({"_id": source_id, "user_id": str(current_user["_id"])})
            if not doc and not extracted_rec:
                raise HTTPException(status_code=404, detail="PDF Document not found.")
            if not text and doc:
                text = (doc.get("extracted_text") or "").strip()
                if not title:
                    title = doc.get("title") or doc.get("fileName") or "Meeting Document"
            if not text:
                doc_name = doc.get("fileName") if doc else "document.pdf"
                text = f"Meeting Document Notes: {title} ({doc_name}). Discussion of project action items, team ownership, deadlines, and deliverables."

        else:
            raise HTTPException(status_code=400, detail=f"Unsupported source_type '{source_type}'.")

    if not title:
        title = "Meeting Discussion"

    # AI Extraction
    extracted_items, model_used = await action_item_service.extract_action_items(
        text=text,
        title=title,
        source_type=source_type
    )

    tasks_col = get_action_items_collection()
    now_iso = datetime.now(timezone.utc).isoformat()
    inserted_tasks = []

    for item in extracted_items:
        task_id = str(uuid.uuid4())
        task_doc = {
            "_id": task_id,
            "user_id": str(current_user["_id"]),
            "source_id": source_id,
            "source_type": source_type,
            "source_title": title,
            "task": item["task"],
            "assigned_to": item["assigned_to"],
            "deadline": item["deadline"],
            "priority": item["priority"],
            "status": "Pending",
            "model_used": model_used,
            "created_at": now_iso,
            "updated_at": now_iso
        }
        await tasks_col.insert_one(task_doc)
        inserted_tasks.append(format_task_doc(task_doc))

    return ActionItemListResponse(
        tasks=[ActionItemResponse(**t) for t in inserted_tasks],
        total=len(inserted_tasks)
    )

@router.post(
    "",
    response_model=ActionItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new task manually"
)
async def create_task(
    request: CreateActionItemRequest,
    current_user: dict = Depends(get_current_user)
):
    if not request.task.strip():
        raise HTTPException(status_code=400, detail="Task description cannot be empty.")

    task_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()
    priority_raw = (request.priority or "Medium").strip().lower()
    priority = {"high": "High", "medium": "Medium", "low": "Low"}.get(priority_raw, "Medium")
    
    status_raw = (request.status or "Pending").strip().lower()
    task_status = {
        "pending": "Pending",
        "in progress": "In Progress",
        "inprogress": "In Progress",
        "in_progress": "In Progress",
        "completed": "Completed"
    }.get(status_raw, "Pending")

    task_doc = {
        "_id": task_id,
        "user_id": str(current_user["_id"]),
        "source_id": request.source_id,
        "source_type": request.source_type or "manual",
        "source_title": request.source_title or "Directly Created Task",
        "task": request.task.strip(),
        "assigned_to": (request.assigned_to or "Unassigned").strip(),
        "deadline": (request.deadline or "Next Sprint").strip(),
        "priority": priority,
        "status": task_status,
        "model_used": "Manual Entry",
        "created_at": now_iso,
        "updated_at": now_iso
    }

    tasks_col = get_action_items_collection()
    await tasks_col.insert_one(task_doc)
    return format_task_doc(task_doc)

@router.get(
    "",
    response_model=ActionItemListResponse,
    summary="List all action items with filtering and search"
)
async def list_tasks(
    status_filter: Optional[str] = Query(None, alias="status"),
    priority_filter: Optional[str] = Query(None, alias="priority"),
    source_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    tasks_col = get_action_items_collection()
    query = {"user_id": str(current_user["_id"])}

    if status_filter and status_filter.lower() != "all":
        query["status"] = status_filter.capitalize()

    if priority_filter and priority_filter.lower() != "all":
        query["priority"] = priority_filter.capitalize()

    if source_id:
        query["source_id"] = source_id

    if search and search.strip():
        term = search.strip()
        query["$or"] = [
            {"task": {"$regex": term, "$options": "i"}},
            {"assigned_to": {"$regex": term, "$options": "i"}},
            {"deadline": {"$regex": term, "$options": "i"}},
            {"source_title": {"$regex": term, "$options": "i"}}
        ]

    cursor = tasks_col.find(query).sort("created_at", -1)
    docs = await cursor.to_list(length=300)
    formatted = [ActionItemResponse(**format_task_doc(d)) for d in docs]

    return ActionItemListResponse(tasks=formatted, total=len(formatted))

@router.get(
    "/stats",
    response_model=ActionItemStatsResponse,
    summary="Get aggregated statistics for task dashboard"
)
async def get_task_stats(current_user: dict = Depends(get_current_user)):
    tasks_col = get_action_items_collection()
    cursor = tasks_col.find({"user_id": str(current_user["_id"])})
    docs = await cursor.to_list(length=1000)

    total = len(docs)
    pending = sum(1 for d in docs if d.get("status") == "Pending")
    in_progress = sum(1 for d in docs if d.get("status") == "In Progress")
    completed = sum(1 for d in docs if d.get("status") == "Completed")
    high = sum(1 for d in docs if d.get("priority") == "High")
    medium = sum(1 for d in docs if d.get("priority") == "Medium")
    low = sum(1 for d in docs if d.get("priority") == "Low")

    rate = round((completed / total * 100), 1) if total > 0 else 0.0

    return ActionItemStatsResponse(
        total_tasks=total,
        pending_tasks=pending,
        in_progress_tasks=in_progress,
        completed_tasks=completed,
        high_priority_tasks=high,
        medium_priority_tasks=medium,
        low_priority_tasks=low,
        completion_rate=rate
    )

@router.get(
    "/{task_id}",
    response_model=ActionItemResponse,
    summary="Get a single action item by ID"
)
async def get_task(task_id: str, current_user: dict = Depends(get_current_user)):
    tasks_col = get_action_items_collection()
    doc = await tasks_col.find_one({"_id": task_id, "user_id": str(current_user["_id"])})
    if not doc:
        raise HTTPException(status_code=404, detail="Task not found.")
    return format_task_doc(doc)

@router.put(
    "/{task_id}",
    response_model=ActionItemResponse,
    summary="Update task details or status"
)
async def update_task(
    task_id: str,
    request: UpdateActionItemRequest,
    current_user: dict = Depends(get_current_user)
):
    tasks_col = get_action_items_collection()
    doc = await tasks_col.find_one({"_id": task_id, "user_id": str(current_user["_id"])})
    if not doc:
        raise HTTPException(status_code=404, detail="Task not found.")

    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if request.task is not None:
        updates["task"] = request.task.strip()
    if request.assigned_to is not None:
        updates["assigned_to"] = request.assigned_to.strip()
    if request.deadline is not None:
        updates["deadline"] = request.deadline.strip()
    if request.priority is not None:
        p_raw = request.priority.strip().lower()
        p_norm = {"high": "High", "medium": "Medium", "low": "Low"}.get(p_raw)
        if p_norm:
            updates["priority"] = p_norm
    if request.status is not None:
        s_raw = request.status.strip().lower()
        s_norm = {
            "pending": "Pending",
            "in progress": "In Progress",
            "inprogress": "In Progress",
            "in_progress": "In Progress",
            "completed": "Completed"
        }.get(s_raw)
        if s_norm:
            updates["status"] = s_norm

    await tasks_col.update_one({"_id": task_id}, {"$set": updates})
    updated_doc = await tasks_col.find_one({"_id": task_id})
    return format_task_doc(updated_doc)

@router.delete(
    "/{task_id}",
    summary="Delete a task"
)
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    tasks_col = get_action_items_collection()
    res = await tasks_col.delete_one({"_id": task_id, "user_id": str(current_user["_id"])})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found.")
    return {"message": "Task deleted successfully", "id": task_id}
