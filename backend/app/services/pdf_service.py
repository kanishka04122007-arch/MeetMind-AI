import os
import re
import shutil
import logging
import asyncio
import concurrent.futures
from typing import Dict, Any, List, Optional
import pdfplumber
import pypdf
from PIL import Image

try:
    import pypdfium2 as pdfium
    _HAS_PDFIUM = True
except ImportError:
    _HAS_PDFIUM = False

try:
    import pytesseract
    # Check common Tesseract installation paths on Windows
    _tesseract_paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        os.path.expanduser(r"~\AppData\Local\Programs\Tesseract-OCR\tesseract.exe"),
    ]
    for _tp in _tesseract_paths:
        if os.path.exists(_tp):
            pytesseract.pytesseract.tesseract_cmd = _tp
            break
    _HAS_PYTESSERACT = True
except ImportError:
    _HAS_PYTESSERACT = False

try:
    import winocr
    _HAS_WINOCR = True
except ImportError:
    _HAS_WINOCR = False

logger = logging.getLogger("uvicorn.error")

def _ocr_image_sync(img: Image.Image) -> str:
    """Run OCR on a PIL image using pytesseract or native Windows Media OCR (winocr)."""
    # 1. Try pytesseract if available and configured
    if _HAS_PYTESSERACT:
        try:
            txt = pytesseract.image_to_string(img)
            if txt and txt.strip():
                return txt.strip()
        except Exception:
            pass

    # 2. Try native Windows Media OCR (winocr)
    if _HAS_WINOCR:
        try:
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = None

            if loop and loop.is_running():
                with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                    return pool.submit(lambda: asyncio.run(winocr.recognize_pil(img, lang="en"))).result().text.strip()
            else:
                return asyncio.run(winocr.recognize_pil(img, lang="en")).text.strip()
        except Exception as e:
            logger.warning(f"winocr recognition error: {e}")

    return ""

def _ocr_scanned_pdf(pdf_path: str) -> Dict[str, Any]:
    """
    Renders each page of a scanned PDF into an image using pypdfium2
    and runs OCR to extract real readable text.
    """
    if not _HAS_PDFIUM:
        logger.error("pypdfium2 is not installed; cannot render pages for OCR.")
        return {"text": "", "pages": [], "word_count": 0, "char_count": 0}

    print("OCR started (if needed)", flush=True)
    logger.info(f"OCR started (if needed): Processing scanned PDF '{pdf_path}'...")

    try:
        pdf_doc = pdfium.PdfDocument(pdf_path)
        total_pages = len(pdf_doc)
        pages_data = []
        full_text_chunks = []

        for idx in range(total_pages):
            page = pdf_doc[idx]
            # Render page to PIL image at scale 1.5 for optimal OCR accuracy and speed
            img = page.render(scale=1.5).to_pil()
            page_text = _ocr_image_sync(img)
            words = re.findall(r'\b\w+\b', page_text)

            pages_data.append({
                "page_number": idx + 1,
                "text": page_text,
                "word_count": len(words),
                "char_count": len(page_text)
            })
            if page_text:
                full_text_chunks.append(page_text)

        full_text = "\n\n".join(full_text_chunks).strip()
        total_words = sum(p["word_count"] for p in pages_data)
        logger.info(f"OCR completed: extracted {len(pages_data)} pages, {total_words} words from {pdf_path}")

        return {
            "text": full_text,
            "pages": pages_data,
            "word_count": total_words,
            "char_count": len(full_text)
        }
    except Exception as e:
        logger.error(f"OCR processing failed for {pdf_path}: {e}")
        return {"text": "", "pages": [], "word_count": 0, "char_count": 0}

def validate_pdf_content(content: bytes) -> bool:
    """
    Validates that the byte content has a valid PDF magic header.
    Standard PDFs start with b'%PDF-'.
    """
    if len(content) < 4:
        return False
    # PDF magic bytes can be at offset 0, or within the first 1024 bytes per PDF spec
    return b"%PDF-" in content[:1024]

def extract_text_from_pdf(pdf_path: str) -> Dict[str, Any]:
    """
    Extracts text and metadata from a PDF file using pdfplumber with OCR fallback for scanned PDFs.
    Returns structured data with page-by-page breakdown and summary statistics.
    Never generates dummy or placeholder text.
    """
    if not os.path.exists(pdf_path):
        return {
            "success": False,
            "error": f"PDF file not found at path: {pdf_path}",
            "text": "",
            "pages": [],
            "page_count": 0,
            "word_count": 0,
            "char_count": 0,
            "metadata": {}
        }

    # 1. Try extraction via pdfplumber
    pages_data = []
    full_text_chunks = []
    extracted_metadata = {}
    engine_used = "pdfplumber"

    try:
        with pdfplumber.open(pdf_path) as pdf:
            extracted_metadata = {k: str(v) for k, v in (pdf.metadata or {}).items() if v}
            for idx, page in enumerate(pdf.pages):
                page_text = page.extract_text(layout=True) or page.extract_text() or ""
                page_text = page_text.strip()
                words = re.findall(r'\b\w+\b', page_text)
                pages_data.append({
                    "page_number": idx + 1,
                    "text": page_text,
                    "word_count": len(words),
                    "char_count": len(page_text)
                })
                if page_text:
                    full_text_chunks.append(page_text)
        full_text = "\n\n".join(full_text_chunks).strip()
    except Exception as plumber_err:
        logger.warning(f"pdfplumber extraction failed on {pdf_path}: {plumber_err}. Attempting pypdf fallback...")
        full_text = ""
        pages_data = []
        try:
            reader = pypdf.PdfReader(pdf_path)
            if reader.metadata:
                extracted_metadata = {str(k): str(v) for k, v in reader.metadata.items() if v}
            for idx, page in enumerate(reader.pages):
                page_text = (page.extract_text() or "").strip()
                words = re.findall(r'\b\w+\b', page_text)
                pages_data.append({
                    "page_number": idx + 1,
                    "text": page_text,
                    "word_count": len(words),
                    "char_count": len(page_text)
                })
                if page_text:
                    full_text_chunks.append(page_text)
            full_text = "\n\n".join(full_text_chunks).strip()
            engine_used = "pypdf"
        except Exception as pypdf_err:
            logger.error(f"Both pdfplumber and pypdf extraction failed for {pdf_path}: {pypdf_err}")
            full_text = ""

    # 2. If extracted text is less than 100 characters, treat as scanned PDF and run OCR
    if len(full_text.strip()) < 100:
        logger.info(f"Extracted text has only {len(full_text.strip())} chars (< 100). Invoking OCR for scanned PDF...")
        ocr_result = _ocr_scanned_pdf(pdf_path)
        if ocr_result.get("text"):
            full_text = ocr_result["text"]
            pages_data = ocr_result["pages"]
            engine_used = "ocr"

    total_words = sum(p["word_count"] for p in pages_data)
    total_chars = len(full_text)

    logger.info(f"Successfully extracted {len(pages_data)} pages ({total_words} words) using {engine_used} from {pdf_path}")
    return {
        "success": True,
        "engine": engine_used,
        "text": full_text,
        "pages": pages_data,
        "page_count": len(pages_data),
        "word_count": total_words,
        "char_count": total_chars,
        "metadata": extracted_metadata
    }

def get_demo_pdf_document(scenario: str = "meeting_notes", custom_title: Optional[str] = None) -> Dict[str, Any]:
    """
    Returns realistic meeting documents with page breakdown for instant testing and viva demonstrations.
    """
    scenarios = {
        "meeting_notes": {
            "title": custom_title or "MeetMind AI - Technical Architecture & Module 2 Spec",
            "filename": "meetmind_module2_spec.pdf",
            "page_count": 3,
            "pages": [
                {
                    "page_number": 1,
                    "text": (
                        "MEETMIND AI — SPRINT 4 MEETING MINUTES & SPECIFICATION\n"
                        "Date: September 28, 2026 | Attendees: Kanishka (Lead), Frontend Team, Backend Core Team\n\n"
                        "1. EXECUTIVE SUMMARY\n"
                        "The MeetMind AI platform addresses high cognitive overhead in modern corporate meetings.\n"
                        "Module 1 (Authentication & Profile Management) provides secure JWT sessions and bcrypt hashing.\n"
                        "Module 2 (Audio & PDF File Upload Management) provides the core ingestion pipeline for:\n"
                        "- Audio/Video recordings: MP3, WAV, M4A, and MP4 (Google Meet, Zoom, MS Teams recordings).\n"
                        "- Meeting documents: PDF notes, agendas, presentations, and product requirements."
                    ),
                    "word_count": 78,
                    "char_count": 560
                },
                {
                    "page_number": 2,
                    "text": (
                        "2. MODULE 2 ARCHITECTURE & DATA FLOW\n"
                        "Input Channels:\n"
                        "- Audio/Video: File format check -> Storage in uploads/audio/ -> FFmpeg audio extraction for MP4 -> Whisper AI Speech-to-Text.\n"
                        "- PDF Documents: MIME & header check -> Storage in uploads/pdf/ -> Text extraction using pdfplumber & pypdf.\n\n"
                        "Storage Layout:\n"
                        "MeetMind AI/\n"
                        "├── uploads/\n"
                        "│   ├── audio/\n"
                        "│   │   └── meeting.mp3\n"
                        "│   └── pdf/\n"
                        "│       └── notes.pdf\n\n"
                        "Database Collections in MongoDB:\n"
                        "1. 'meetings' collection for audio recordings, duration, transcript segments, and speaker turns.\n"
                        "2. 'documents' collection for meeting PDFs, extracted text, page count, and word statistics."
                    ),
                    "word_count": 96,
                    "char_count": 740
                },
                {
                    "page_number": 3,
                    "text": (
                        "3. ACTION ITEMS & NEXT STEPS\n"
                        "- [ACTION-01] Lead Developer: Ensure FFmpeg extracts 16kHz audio for optimal Whisper transcription.\n"
                        "- [ACTION-02] Backend Team: Validate file integrity and size limits (100MB Audio/Video, 50MB PDF).\n"
                        "- [ACTION-03] Frontend Team: Implement dual dropzones with instant progress feedback and audio player.\n"
                        "- [ACTION-04] QA & Viva Prep: Prepare live demonstration with real MP4 recordings and multi-page PDFs.\n\n"
                        "Approved by: Kanishka (Lead Architect) | Status: Production Ready"
                    ),
                    "word_count": 68,
                    "char_count": 520
                }
            ],
            "metadata": {
                "Title": "MeetMind AI - Module 2 Technical Architecture",
                "Author": "MeetMind Core Engineering",
                "Subject": "Audio and PDF Upload System",
                "Producer": "pdfplumber 0.11"
            }
        },
        "sprint_retro": {
            "title": custom_title or "Sprint Retrospective & Action Items Document",
            "filename": "sprint_retro_actions.pdf",
            "page_count": 2,
            "pages": [
                {
                    "page_number": 1,
                    "text": (
                        "SPRINT RETROSPECTIVE NOTES — MEETMIND AI PLATFORM\n"
                        "Date: September 28, 2026 | Facilitator: Agile Scrum Master\n\n"
                        "WHAT WENT WELL:\n"
                        "1. Module 1 Authentication delivered 100% test coverage with robust JWT token expiry handling.\n"
                        "2. Whisper AI transcription achieves >95% accuracy on meeting speech.\n"
                        "3. MongoDB integration supports fast asynchronous CRUD queries."
                    ),
                    "word_count": 52,
                    "char_count": 380
                },
                {
                    "page_number": 2,
                    "text": (
                        "AREAS FOR IMPROVEMENT & DECISIONS:\n"
                        "1. Support direct upload of Zoom and Google Meet recordings in MP4 format.\n"
                        "2. Support PDF meeting document ingestion alongside audio transcripts for full context.\n"
                        "3. Use pdfplumber for high-fidelity text extraction.\n\n"
                        "DECISION: Module 2 officially encompasses both Audio/Video and PDF file ingestion."
                    ),
                    "word_count": 47,
                    "char_count": 350
                }
            ],
            "metadata": {
                "Title": "Sprint Retrospective Notes",
                "Author": "MeetMind Scrum Team",
                "Subject": "Retrospective",
                "Producer": "pdfplumber 0.11"
            }
        }
    }

    selected = scenarios.get(scenario, scenarios["meeting_notes"])
    full_text = "\n\n".join(p["text"] for p in selected["pages"])
    total_words = sum(p["word_count"] for p in selected["pages"])
    total_chars = len(full_text)

    return {
        "title": selected["title"],
        "filename": selected["filename"],
        "page_count": selected["page_count"],
        "word_count": total_words,
        "char_count": total_chars,
        "text": full_text,
        "pages": selected["pages"],
        "metadata": selected["metadata"]
    }
