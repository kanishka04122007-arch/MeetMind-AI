import os
import uuid
import re
import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse

from app.config import settings
from app.database import get_documents_collection, get_extracted_text_collection, get_files_collection
from app.dependencies import get_current_user
from app.models.document import (
    PDFDocumentResponse,
    PDFListItem,
    PDFListResponse,
    DemoPDFRequest,
    UpdatePDFTextRequest
)
from app.services.pdf_service import (
    validate_pdf_content,
    extract_text_from_pdf,
    get_demo_pdf_document
)

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/documents", tags=["Meeting PDF Documents Upload (Module 2)"])

def format_pdf_doc(doc: dict) -> dict:
    file_name = doc.get("fileName") or doc.get("filename") or "document.pdf"
    upload_date = doc.get("uploadDate") or (str(doc.get("created_at", ""))[:10] if doc.get("created_at") else datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    return {
        "_id": str(doc["_id"]),
        "user_id": str(doc.get("user_id", "")),
        "title": doc.get("title", "Untitled Document"),
        "fileName": file_name,
        "filename": file_name,
        "stored_filename": doc.get("stored_filename"),
        "file_url": doc.get("file_url"),
        "file_size": doc.get("file_size", 0),
        "page_count": doc.get("page_count", 1),
        "word_count": doc.get("word_count", 0),
        "char_count": doc.get("char_count", 0),
        "status": doc.get("status", "Uploaded"),
        "uploadDate": upload_date,
        "extracted_text": doc.get("extracted_text", ""),
        "pages": doc.get("pages", []),
        "metadata": doc.get("metadata", {}),
        "error_message": doc.get("error_message"),
        "created_at": str(doc.get("created_at", "")),
        "updated_at": str(doc.get("updated_at", ""))
    }

@router.post(
    "/upload",
    response_model=PDFDocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload meeting PDF document and extract text using pdfplumber / pypdf"
)
async def upload_meeting_pdf(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    original_filename = file.filename or "document.pdf"
    file_ext = os.path.splitext(original_filename)[1].lower()

    # 1. Format Validation: Reject non-PDF files
    if file_ext in {".mp3", ".wav", ".m4a", ".mp4", ".ogg", ".webm"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Audio/Video recordings must be uploaded via the Audio & Video Upload module (/api/meetings/upload)."
        )

    if file_ext not in settings.ALLOWED_PDF_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported document format '{file_ext}'. Only PDF documents (.pdf) are accepted. Image files (.jpg, .png) and executables are rejected."
        )

    # 2. Read content and validate size limit
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read uploaded PDF: {str(e)}"
        )

    file_size = len(content)
    if file_size > settings.MAX_PDF_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"PDF file size ({file_size // (1024*1024)}MB) exceeds maximum limit of {settings.MAX_PDF_SIZE_BYTES // (1024*1024)}MB."
        )

    # 3. Magic Header Validation
    if not validate_pdf_content(content):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid PDF file. Header signature '%PDF-' was not found. Please upload a genuine PDF document."
        )

    # 4. Secure File Storage in uploads/pdf/
    os.makedirs(settings.PDF_UPLOAD_DIR, exist_ok=True)
    doc_id = str(uuid.uuid4())
    stored_filename = f"{doc_id}.pdf"
    saved_file_path = os.path.join(settings.PDF_UPLOAD_DIR, stored_filename)

    try:
        with open(saved_file_path, "wb") as f:
            f.write(content)
        print("PDF uploaded", flush=True)
        print("PDF uploaded successfully", flush=True)
        logger.info(f"PDF uploaded successfully: {original_filename} (size: {file_size} bytes, id: {doc_id})")
    except Exception as e:
        print(f"Error saving PDF document: {e}", flush=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to securely save PDF document: {str(e)}"
        )

    # 5. Extract Text using pdfplumber / pypdf with OCR fallback
    print("Text extraction started", flush=True)
    logger.info(f"Text extraction started for PDF: {original_filename}")
    try:
        extraction_result = extract_text_from_pdf(saved_file_path)
        extracted_text = (extraction_result.get("text") or "").strip()
        print("Text extracted successfully", flush=True)
        logger.info(f"Text extracted successfully: {extraction_result.get('word_count', 0)} words, {extraction_result.get('page_count', 0)} pages")
    except Exception as e:
        print(f"Error extracting text from PDF: {e}", flush=True)
        extraction_result = {"text": "", "page_count": 1, "word_count": 0, "char_count": 0, "pages": [], "success": False, "error": str(e)}
        extracted_text = ""

    clean_title = (title or "").strip()
    if not clean_title:
        base_name = os.path.splitext(original_filename)[0]
        clean_title = base_name.replace("_", " ").replace("-", " ").capitalize()

    now_dt = datetime.now(timezone.utc)
    now_iso = now_dt.isoformat()
    upload_date = now_dt.strftime("%Y-%m-%d")

    # Save to MongoDB files collection (Module 1 Requirement)
    files_col = get_files_collection()
    file_record = {
        "_id": doc_id,
        "file_id": doc_id,
        "file_name": original_filename,
        "fileName": original_filename,
        "file_type": "pdf",
        "fileType": "pdf",
        "uploaded_at": now_iso,
        "uploadedAt": now_iso,
        "status": "Completed" if extraction_result.get("success") else "Failed",
        "user_id": str(current_user["_id"])
    }
    await files_col.replace_one({"file_id": doc_id}, file_record, upsert=True)
    print("Saved to MongoDB", flush=True)
    logger.info(f"Saved to MongoDB: Stored file metadata into 'files' collection (file_id='{doc_id}')")

    # Save extracted text into MongoDB meetmind_ai.extracted_text collection (Module 2 Requirement)
    extracted_text_col = get_extracted_text_collection()
    extracted_record = {
        "_id": doc_id,
        "file_id": doc_id,
        "file_name": original_filename,
        "filename": original_filename,
        "fileName": original_filename,
        "text": extracted_text,
        "created_at": now_iso,
        "createdAt": now_iso,
        "user_id": str(current_user["_id"])
    }
    await extracted_text_col.replace_one({"file_id": doc_id}, extracted_record, upsert=True)
    print("Saved to MongoDB", flush=True)
    logger.info(f"Saved to MongoDB: Stored extracted text into 'extracted_text' collection (file_id='{doc_id}')")

    # Save to MongoDB documents collection (for frontend compatibility)
    doc_record = {
        "_id": doc_id,
        "user_id": str(current_user["_id"]),
        "title": clean_title,
        "fileName": original_filename,
        "filename": original_filename,
        "stored_filename": stored_filename,
        "file_path": saved_file_path,
        "file_url": f"{settings.API_V1_PREFIX}/documents/download/{stored_filename}",
        "file_size": file_size,
        "page_count": extraction_result.get("page_count", 1),
        "word_count": extraction_result.get("word_count", 0),
        "char_count": extraction_result.get("char_count", 0),
        "status": "Uploaded" if extraction_result.get("success") else "Failed",
        "uploadDate": upload_date,
        "extracted_text": extracted_text,
        "pages": extraction_result.get("pages", []),
        "metadata": extraction_result.get("metadata", {}),
        "error_message": extraction_result.get("error"),
        "created_at": now_iso,
        "updated_at": now_iso
    }
    documents_col = get_documents_collection()
    await documents_col.replace_one({"_id": doc_id}, doc_record, upsert=True)

    return format_pdf_doc(doc_record)

@router.post(
    "/demo",
    response_model=PDFDocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a realistic sample meeting PDF notes document for demonstration"
)
async def create_demo_pdf(
    request: DemoPDFRequest,
    current_user: dict = Depends(get_current_user)
):
    demo_data = get_demo_pdf_document(request.scenario or "meeting_notes", request.title)
    doc_id = str(uuid.uuid4())
    now_dt = datetime.now(timezone.utc)
    now_iso = now_dt.isoformat()
    upload_date = now_dt.strftime("%Y-%m-%d")

    doc_record = {
        "_id": doc_id,
        "user_id": str(current_user["_id"]),
        "title": demo_data["title"],
        "fileName": demo_data["filename"],
        "filename": demo_data["filename"],
        "stored_filename": None,
        "file_path": None,
        "file_url": None,
        "file_size": 245760,  # ~240KB simulated
        "page_count": demo_data["page_count"],
        "word_count": demo_data["word_count"],
        "char_count": demo_data["char_count"],
        "status": "Uploaded",
        "uploadDate": upload_date,
        "extracted_text": demo_data["text"],
        "pages": demo_data["pages"],
        "metadata": demo_data["metadata"],
        "error_message": None,
        "created_at": now_iso,
        "updated_at": now_iso
    }

    documents_col = get_documents_collection()
    await documents_col.insert_one(doc_record)
    logger.info(f"MongoDB save successful: Saved demo PDF metadata into 'documents' collection with id='{doc_id}'")

    # Save demo text into extracted_text collection as well
    extracted_text_col = get_extracted_text_collection()
    demo_extracted_record = {
        "_id": doc_id,
        "file_id": doc_id,
        "filename": demo_data["filename"],
        "text": demo_data["text"],
        "createdAt": now_iso,
        "user_id": str(current_user["_id"])
    }
    await extracted_text_col.replace_one({"file_id": doc_id}, demo_extracted_record, upsert=True)
    logger.info(f"MongoDB save successful: Saved extracted text into 'extracted_text' collection for file_id='{doc_id}'")

    return format_pdf_doc(doc_record)

@router.get(
    "",
    response_model=PDFListResponse,
    summary="List all uploaded PDF documents for current authenticated user"
)
async def list_documents(current_user: dict = Depends(get_current_user)):
    documents_col = get_documents_collection()
    cursor = documents_col.find({"user_id": str(current_user["_id"])}).sort("created_at", -1)

    documents = []
    async for doc in cursor:
        preview = doc.get("extracted_text", "")
        if len(preview) > 130:
            preview = preview[:127] + "..."

        file_name = doc.get("fileName") or doc.get("filename") or "document.pdf"
        upload_date = doc.get("uploadDate") or (str(doc.get("created_at", ""))[:10] if doc.get("created_at") else "")

        documents.append(PDFListItem(
            _id=str(doc["_id"]),
            user_id=str(doc.get("user_id", "")),
            title=doc.get("title", "Untitled Document"),
            fileName=file_name,
            filename=file_name,
            file_size=doc.get("file_size", 0),
            page_count=doc.get("page_count", 1),
            word_count=doc.get("word_count", 0),
            status=doc.get("status", "Uploaded"),
            uploadDate=upload_date,
            text_preview=preview,
            created_at=str(doc.get("created_at", ""))
        ))

    return PDFListResponse(documents=documents, total=len(documents))

@router.get(
    "/stats",
    summary="Get user PDF document statistics"
)
async def get_document_stats(current_user: dict = Depends(get_current_user)):
    documents_col = get_documents_collection()
    cursor = documents_col.find({"user_id": str(current_user["_id"])})

    total_docs = 0
    total_pages = 0
    total_words = 0

    async for doc in cursor:
        total_docs += 1
        total_pages += doc.get("page_count", 1)
        total_words += doc.get("word_count", 0)

    return {
        "total_documents": total_docs,
        "total_pages": total_pages,
        "total_words_extracted": total_words
    }

@router.get(
    "/{doc_id}",
    response_model=PDFDocumentResponse,
    summary="Get full PDF document extracted text and page breakdown"
)
async def get_document(
    doc_id: str,
    current_user: dict = Depends(get_current_user)
):
    documents_col = get_documents_collection()
    doc = await documents_col.find_one({
        "_id": doc_id,
        "user_id": str(current_user["_id"])
    })

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or you do not have permission to view it."
        )

    return format_pdf_doc(doc)

@router.put(
    "/{doc_id}/text",
    response_model=PDFDocumentResponse,
    summary="Update PDF extracted text or document title"
)
async def update_document_text(
    doc_id: str,
    payload: UpdatePDFTextRequest,
    current_user: dict = Depends(get_current_user)
):
    documents_col = get_documents_collection()
    doc = await documents_col.find_one({
        "_id": doc_id,
        "user_id": str(current_user["_id"])
    })

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or you do not have permission to edit it."
        )

    update_fields = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if payload.title is not None and payload.title.strip():
        update_fields["title"] = payload.title.strip()
    if payload.extracted_text is not None:
        clean_text = payload.extracted_text.strip()
        update_fields["extracted_text"] = clean_text
        words = re.findall(r'\b\w+\b', clean_text)
        update_fields["word_count"] = len(words)
        update_fields["char_count"] = len(clean_text)

    await documents_col.update_one(
        {"_id": doc_id},
        {"$set": update_fields}
    )

    if payload.extracted_text is not None:
        extracted_text_col = get_extracted_text_collection()
        await extracted_text_col.update_one(
            {"file_id": doc_id},
            {"$set": {"text": clean_text, "updatedAt": update_fields["updated_at"]}},
            upsert=True
        )
        logger.info(f"MongoDB save successful: Updated text in 'extracted_text' collection for file_id='{doc_id}'")

    updated_doc = await documents_col.find_one({"_id": doc_id})
    return format_pdf_doc(updated_doc)

@router.delete(
    "/{doc_id}",
    summary="Delete a PDF document and remove file from disk"
)
async def delete_document(
    doc_id: str,
    current_user: dict = Depends(get_current_user)
):
    documents_col = get_documents_collection()
    doc = await documents_col.find_one({
        "_id": doc_id,
        "user_id": str(current_user["_id"])
    })

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or you do not have permission to delete it."
        )

    file_path = doc.get("file_path")
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass

    await documents_col.delete_one({"_id": doc_id})
    extracted_text_col = get_extracted_text_collection()
    await extracted_text_col.delete_one({"file_id": doc_id})
    logger.info(f"MongoDB save successful: Deleted document and extracted text for file_id='{doc_id}'")
    return {"message": "Document deleted successfully", "document_id": doc_id}

@router.get(
    "/download/{stored_filename}",
    summary="Download or preview stored PDF document"
)
async def download_pdf_file(stored_filename: str):
    file_path = os.path.join(settings.PDF_UPLOAD_DIR, stored_filename)
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF document not found on server."
        )
    return FileResponse(
        file_path,
        media_type="application/pdf",
        filename=stored_filename
    )
