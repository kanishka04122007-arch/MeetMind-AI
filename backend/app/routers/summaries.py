import os
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import FileResponse

from app.database import (
    get_summaries_collection,
    get_meetings_collection,
    get_documents_collection,
    get_extracted_text_collection,
    get_transcripts_collection
)
from app.dependencies import get_current_user
from app.models.summary import (
    GenerateSummaryRequest,
    SummaryResponse,
    SummaryListItem,
    SummaryListResponse,
    SummaryStatsResponse
)
from app.services.summary_service import summary_service
from app.services.pdf_service import extract_text_from_pdf

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/summaries", tags=["Module 3: AI Summary Generation"])

def format_summary_doc(doc: dict) -> dict:
    if not doc:
        return {}
    doc_copy = dict(doc)
    doc_copy["_id"] = str(doc_copy["_id"])
    return doc_copy

@router.post(
    "/generate",
    response_model=SummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate an AI-powered summary from meeting transcript or PDF text"
)
async def generate_summary(
    request: GenerateSummaryRequest,
    current_user: dict = Depends(get_current_user)
):
    source_id = request.source_id.strip()
    source_type = request.source_type.strip().lower()
    text = (request.text or "").strip()
    title = (request.title or "").strip()
    now_iso = datetime.now(timezone.utc).isoformat()

    # If text is not provided in request body, retrieve it from the respective MongoDB collection
    if not text:
        if source_type in ["document", "pdf"]:
            # Requirement 4: Read extracted text from meetmind_ai.extracted_text collection for PDFs
            extracted_text_col = get_extracted_text_collection()
            extracted_rec = await extracted_text_col.find_one({"file_id": source_id})
            if not extracted_rec:
                extracted_rec = await extracted_text_col.find_one({"_id": source_id})
            
            if extracted_rec and extracted_rec.get("text"):
                text = extracted_rec["text"].strip()
                if not title:
                    title = extracted_rec.get("filename") or "Meeting Document"
                logger.info(f"Retrieved extracted text from 'extracted_text' collection for file_id='{source_id}' ({len(text.split())} words)")

            # Fallback to documents collection if not yet populated in extracted_text collection
            docs_col = get_documents_collection()
            doc = await docs_col.find_one({"_id": source_id, "user_id": str(current_user["_id"])})
            if not doc:
                doc = await docs_col.find_one({"_id": source_id})
            if not doc:
                doc = await docs_col.find_one({"fileName": source_id})

            if doc:
                if not title:
                    title = doc.get("title") or doc.get("fileName") or "Meeting Document"
                if not text:
                    text = (doc.get("extracted_text") or "").strip()

                # Requirement 6: If text is empty, check if physical PDF file exists on disk and extract on-the-fly
                if not text and doc.get("file_path") and os.path.exists(doc["file_path"]):
                    logger.info(f"Re-extracting text on demand from '{doc['file_path']}'...")
                    re_extract = extract_text_from_pdf(doc["file_path"])
                    text = (re_extract.get("text") or "").strip()
                    if text:
                        logger.info(f"Text extracted successfully on demand: {re_extract.get('word_count', 0)} words")
                        await docs_col.update_one(
                            {"_id": doc["_id"]},
                            {"$set": {"extracted_text": text, "word_count": re_extract.get("word_count", 0)}}
                        )

            if not doc and not extracted_rec:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Meeting PDF document with ID '{source_id}' not found."
                )

            # If still empty after checking extracted_text and documents, reject because database actually has no extracted text
            if not text:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This PDF document does not contain any extracted text yet."
                )

            # Save / backfill extracted text into meetmind_ai.extracted_text (Requirement 1 & 3)
            await extracted_text_col.replace_one(
                {"file_id": source_id},
                {
                    "_id": source_id,
                    "file_id": source_id,
                    "file_name": doc.get("fileName") or doc.get("filename") if doc else title,
                    "filename": doc.get("fileName") or doc.get("filename") if doc else title,
                    "text": text,
                    "created_at": doc.get("created_at") if doc else now_iso,
                    "createdAt": doc.get("created_at") if doc else now_iso,
                    "user_id": str(current_user["_id"])
                },
                upsert=True
            )
            logger.info(f"MongoDB save successful: Saved extracted text into 'extracted_text' collection for file_id='{source_id}'")

        elif source_type in ["meeting", "audio", "video"]:
            # Requirement 4: Read transcript text from meetmind_ai.transcripts collection for audio
            transcripts_col = get_transcripts_collection()
            transcript_rec = await transcripts_col.find_one({"file_id": source_id})
            if not transcript_rec:
                transcript_rec = await transcripts_col.find_one({"_id": source_id})

            if transcript_rec and transcript_rec.get("text"):
                text = transcript_rec["text"].strip()
                if not title:
                    title = transcript_rec.get("filename") or "Meeting Recording"
                logger.info(f"Retrieved transcript text from 'transcripts' collection for file_id='{source_id}' ({len(text.split())} words)")
            elif transcript_rec and transcript_rec.get("transcript"):
                text = transcript_rec["transcript"].strip()
                if not title:
                    title = transcript_rec.get("file_name") or transcript_rec.get("filename") or "Meeting Recording"

            # Fallback to meetings collection if not yet in transcripts collection
            meetings_col = get_meetings_collection()
            meeting = await meetings_col.find_one({"_id": source_id, "user_id": str(current_user["_id"])})
            if not meeting:
                meeting = await meetings_col.find_one({"_id": source_id})
            if not meeting:
                meeting = await meetings_col.find_one({"fileName": source_id})

            if meeting:
                if not title:
                    title = meeting.get("title") or meeting.get("fileName") or "Meeting Session"
                if not text:
                    text = (meeting.get("transcript_text") or "").strip()

            if not meeting and not transcript_rec:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Meeting recording with ID '{source_id}' not found."
                )

            if not text:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This audio recording does not contain any transcript yet."
                )

            # Save / backfill transcript into meetmind_ai.transcripts (Requirement 2 & 3)
            await transcripts_col.replace_one(
                {"file_id": source_id},
                {
                    "_id": source_id,
                    "file_id": source_id,
                    "file_name": meeting.get("fileName") or meeting.get("filename") if meeting else title,
                    "filename": meeting.get("fileName") or meeting.get("filename") if meeting else title,
                    "transcript": text,
                    "text": text,
                    "created_at": meeting.get("created_at") if meeting else now_iso,
                    "createdAt": meeting.get("created_at") if meeting else now_iso,
                    "user_id": str(current_user["_id"])
                },
                upsert=True
            )
            logger.info(f"MongoDB save successful: Saved transcript into 'transcripts' collection for file_id='{source_id}'")

        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported source_type '{source_type}'. Expected 'meeting' or 'document'."
            )

    if not title:
        title = "Meeting Discussion"

    # If text was provided directly in request body, ensure it is mirrored in extracted_text or transcripts
    if source_type in ["document", "pdf"]:
        extracted_text_col = get_extracted_text_collection()
        await extracted_text_col.update_one(
            {"file_id": source_id},
            {"$setOnInsert": {
                "_id": source_id,
                "file_id": source_id,
                "filename": title,
                "text": text,
                "createdAt": now_iso,
                "user_id": str(current_user["_id"])
            }},
            upsert=True
        )
    elif source_type in ["meeting", "audio", "video"]:
        transcripts_col = get_transcripts_collection()
        await transcripts_col.update_one(
            {"file_id": source_id},
            {"$setOnInsert": {
                "_id": source_id,
                "file_id": source_id,
                "filename": title,
                "text": text,
                "createdAt": now_iso,
                "user_id": str(current_user["_id"])
            }},
            upsert=True
        )

    # Generate Summary via AI Engine (Gemini Primary + Local NLP Engine Fallback)
    try:
        structured_data, summary_markdown, model_used = await summary_service.generate_summary(
            text=text,
            title=title,
            source_type=source_type,
            style=request.style or "executive"
        )
        print("Summary generated successfully", flush=True)
        logger.info(f"Summary generated successfully for source_id='{source_id}' ('{title}') using {model_used}")
    except Exception as e:
        print(f"Error generating summary: {e}", flush=True)
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate summary: {str(e)}"
        )

    stats = summary_service.calculate_stats(text, summary_markdown)

    summaries_col = get_summaries_collection()

    # Check if a summary already exists for this source and user (upsert behavior)
    existing = await summaries_col.find_one({
        "$or": [
            {"source_id": source_id, "user_id": str(current_user["_id"])},
            {"file_id": source_id, "user_id": str(current_user["_id"])},
            {"_id": source_id}
        ]
    })

    if existing:
        summary_id = str(existing["_id"])
        summary_doc = {
            "_id": summary_id,
            "file_id": source_id,
            "source_id": source_id,
            "file_name": title,
            "fileName": title,
            "source_title": title,
            "source_type": source_type,
            "summary": summary_markdown,
            "summary_text": summary_markdown,
            "structured_data": structured_data,
            "original_word_count": stats["original_word_count"],
            "summary_word_count": stats["summary_word_count"],
            "compression_ratio": stats["compression_ratio"],
            "reading_time_saved_mins": stats["reading_time_saved_mins"],
            "model_used": model_used,
            "style": request.style or "executive",
            "created_at": existing.get("created_at", now_iso),
            "createdAt": existing.get("createdAt", now_iso),
            "updated_at": now_iso,
            "user_id": str(current_user["_id"])
        }
        await summaries_col.replace_one({"_id": summary_id}, summary_doc)
        print("Saved to MongoDB", flush=True)
        logger.info(f"Saved to MongoDB: Updated existing summary in 'summaries' collection with id='{summary_id}'")
    else:
        summary_id = str(uuid.uuid4())
        summary_doc = {
            "_id": summary_id,
            "file_id": source_id,
            "source_id": source_id,
            "file_name": title,
            "fileName": title,
            "source_title": title,
            "source_type": source_type,
            "summary": summary_markdown,
            "summary_text": summary_markdown,
            "structured_data": structured_data,
            "original_word_count": stats["original_word_count"],
            "summary_word_count": stats["summary_word_count"],
            "compression_ratio": stats["compression_ratio"],
            "reading_time_saved_mins": stats["reading_time_saved_mins"],
            "model_used": model_used,
            "style": request.style or "executive",
            "created_at": now_iso,
            "createdAt": now_iso,
            "updated_at": now_iso,
            "user_id": str(current_user["_id"])
        }
        await summaries_col.insert_one(summary_doc)
        print("Saved to MongoDB", flush=True)
        logger.info(f"Saved to MongoDB: Saved new summary into 'summaries' collection with id='{summary_id}'")

    return format_summary_doc(summary_doc)

@router.get(
    "",
    response_model=SummaryListResponse,
    summary="List all generated summaries for current user"
)
async def list_summaries(current_user: dict = Depends(get_current_user)):
    summaries_col = get_summaries_collection()
    cursor = summaries_col.find({"user_id": str(current_user["_id"])}).sort("updated_at", -1)
    docs = await cursor.to_list(length=100)

    items = []
    for d in docs:
        overview = d.get("structured_data", {}).get("overview", "")
        if len(overview) > 160:
            overview = overview[:157] + "..."
        items.append(SummaryListItem(
            id=str(d["_id"]),
            user_id=str(d["user_id"]),
            source_id=d["source_id"],
            source_type=d["source_type"],
            source_title=d["source_title"],
            original_word_count=d.get("original_word_count", 0),
            summary_word_count=d.get("summary_word_count", 0),
            compression_ratio=d.get("compression_ratio", 0.0),
            reading_time_saved_mins=d.get("reading_time_saved_mins", 0.0),
            model_used=d.get("model_used", "MeetMind AI Engine"),
            style=d.get("style", "executive"),
            overview_preview=overview,
            created_at=d.get("created_at", "")
        ))

    return SummaryListResponse(summaries=items, total=len(items))

@router.get(
    "/stats/overview",
    response_model=SummaryStatsResponse,
    summary="Aggregate summary statistics across all sessions"
)
async def get_summary_stats(current_user: dict = Depends(get_current_user)):
    summaries_col = get_summaries_collection()
    cursor = summaries_col.find({"user_id": str(current_user["_id"])})
    docs = await cursor.to_list(length=1000)

    total_summaries = len(docs)
    total_original_words = sum(d.get("original_word_count", 0) for d in docs)
    total_summary_words = sum(d.get("summary_word_count", 0) for d in docs)
    total_reading_time = sum(d.get("reading_time_saved_mins", 0.0) for d in docs)
    
    avg_ratio = 0.0
    if total_summaries > 0:
        avg_ratio = round(sum(d.get("compression_ratio", 0.0) for d in docs) / total_summaries, 1)

    return SummaryStatsResponse(
        total_summaries=total_summaries,
        total_original_words=total_original_words,
        total_summary_words=total_summary_words,
        avg_compression_ratio=avg_ratio,
        total_reading_time_saved_mins=round(total_reading_time, 1)
    )

@router.get(
    "/source/{source_id}",
    response_model=Optional[SummaryResponse],
    summary="Get latest summary for a specific meeting or document"
)
@router.get(
    "/file/{source_id}",
    response_model=Optional[SummaryResponse],
    summary="Get latest summary for a specific file by file_id"
)
async def get_summary_by_source(
    source_id: str,
    current_user: dict = Depends(get_current_user)
):
    summaries_col = get_summaries_collection()
    doc = await summaries_col.find_one({
        "$or": [
            {"source_id": source_id, "user_id": str(current_user["_id"])},
            {"file_id": source_id, "user_id": str(current_user["_id"])},
            {"_id": source_id}
        ]
    })
    if not doc:
        return None
    return format_summary_doc(doc)

@router.get(
    "/{summary_id}",
    response_model=SummaryResponse,
    summary="Get single summary details by ID"
)
async def get_summary(
    summary_id: str,
    current_user: dict = Depends(get_current_user)
):
    summaries_col = get_summaries_collection()
    doc = await summaries_col.find_one({"_id": summary_id, "user_id": str(current_user["_id"])})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Summary with ID '{summary_id}' not found."
        )
    return format_summary_doc(doc)

@router.delete(
    "/{summary_id}",
    summary="Delete a generated summary"
)
async def delete_summary(
    summary_id: str,
    current_user: dict = Depends(get_current_user)
):
    summaries_col = get_summaries_collection()
    res = await summaries_col.delete_one({"_id": summary_id, "user_id": str(current_user["_id"])})
    if res.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Summary with ID '{summary_id}' not found."
        )
    return {"message": "Summary deleted successfully", "id": summary_id}

@router.get(
    "/{summary_id}/pdf",
    summary="Download formatted PDF summary report"
)
async def download_summary_pdf(
    summary_id: str,
    current_user: dict = Depends(get_current_user)
):
    summaries_col = get_summaries_collection()
    doc = await summaries_col.find_one({"_id": summary_id, "user_id": str(current_user["_id"])})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Summary not found.")

    stats = {
        "original_word_count": doc.get("original_word_count", 0),
        "summary_word_count": doc.get("summary_word_count", 0),
        "compression_ratio": doc.get("compression_ratio", 0.0),
        "reading_time_saved_mins": doc.get("reading_time_saved_mins", 0.0)
    }

    try:
        pdf_path = summary_service.generate_pdf_file(
            summary_id=summary_id,
            title=doc.get("source_title", "Meeting"),
            structured_data=doc.get("structured_data", {}),
            stats=stats,
            model_used=doc.get("model_used", "MeetMind AI Engine")
        )

        clean_filename = f"{doc.get('source_title', 'Meeting').replace(' ', '_')}_Summary.pdf"
        return FileResponse(
            path=pdf_path,
            filename=clean_filename,
            media_type="application/pdf"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate summary PDF: {str(e)}"
        )

@router.get(
    "/{summary_id}/txt",
    summary="Download summary as clean text file"
)
async def download_summary_txt(
    summary_id: str,
    current_user: dict = Depends(get_current_user)
):
    summaries_col = get_summaries_collection()
    doc = await summaries_col.find_one({"_id": summary_id, "user_id": str(current_user["_id"])})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Summary not found.")

    clean_filename = f"{doc.get('source_title', 'Meeting').replace(' ', '_')}_Summary.txt"
    content = doc.get("summary_text", "")

    return Response(
        content=content,
        media_type="text/plain",
        headers={
            "Content-Disposition": f'attachment; filename="{clean_filename}"'
        }
    )
