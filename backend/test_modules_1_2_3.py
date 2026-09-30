import urllib.request
import urllib.error
import json
import wave
import math
import struct
import os
import sys

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_URL = "http://127.0.0.1:8000/api"

def create_sample_wav(filename="verify_audio.wav"):
    with wave.open(filename, 'w') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(16000)
        # 1.5s tone
        for i in range(int(16000 * 1.5)):
            val = int(32767.0 * math.sin(2.0 * math.pi * 440.0 * i / 16000))
            f.writeframesraw(struct.pack('<h', val))
    return filename

def create_sample_pdf(filename="verify_notes.pdf"):
    pdf_content = (
        b"%PDF-1.4\n"
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
        b"4 0 obj\n<< /Length 85 >>\nstream\n"
        b"BT /F1 12 Tf 72 700 Td (MeetMind AI - Modules 1, 2, 3 Complete Verification Document) Tj ET\n"
        b"endstream\nendobj\n"
        b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
        b"xref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000227 00000 n \n0000000364 00000 n \n"
        b"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n443\n%%EOF\n"
    )
    with open(filename, "wb") as f:
        f.write(pdf_content)
    return filename

def make_multipart_body(fields, files, boundary="----WebKitFormBoundaryMeetMindVerify2026"):
    body = bytearray()
    for name, value in fields.items():
        body.extend(f"--{boundary}\r\n".encode())
        body.extend(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode())
        body.extend(str(value).encode())
        body.extend(b"\r\n")

    for field_name, (fn, content, content_type) in files.items():
        body.extend(f"--{boundary}\r\n".encode())
        body.extend(f'Content-Disposition: form-data; name="{field_name}"; filename="{fn}"\r\n'.encode())
        body.extend(f"Content-Type: {content_type}\r\n\r\n".encode())
        body.extend(content)
        body.extend(b"\r\n")

    body.extend(f"--{boundary}--\r\n".encode())
    return bytes(body), f"multipart/form-data; boundary={boundary}"

def run_tests():
    print("==================================================================")
    print("  MEETMIND AI: MODULES 1, 2 & 3 END-TO-END VERIFICATION TEST")
    print("==================================================================")

    # 1. Login
    print("\n[Step 1] Authenticating user (kanishka@gmail.com)...")
    login_data = json.dumps({"email": "kanishka@gmail.com", "password": "Password@123"}).encode('utf-8')
    req = urllib.request.Request(f"{BASE_URL}/auth/login", data=login_data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as res:
        login_res = json.loads(res.read().decode())
        token = login_res["access_token"]
        print("  ✓ Login successful!")

    headers = {"Authorization": f"Bearer {token}"}

    # 2. PDF Upload & Text Extraction
    print("\n[Step 2] Testing PDF Upload Flow...")
    pdf_fn = create_sample_pdf()
    with open(pdf_fn, "rb") as f:
        pdf_bytes = f.read()

    body, ctype = make_multipart_body(
        {"title": "Verification PDF Document"},
        {"file": (pdf_fn, pdf_bytes, "application/pdf")}
    )
    req = urllib.request.Request(f"{BASE_URL}/documents/upload", data=body, headers={**headers, "Content-Type": ctype})
    with urllib.request.urlopen(req) as res:
        pdf_res = json.loads(res.read().decode())
        pdf_id = pdf_res["_id"]
        print(f"  ✓ PDF uploaded successfully! ID: {pdf_id}")
        print(f"  ✓ Extracted text words: {pdf_res.get('word_count')}")

    # Query MongoDB directly via MongoClient to verify collections
    from pymongo import MongoClient
    client = MongoClient("mongodb://localhost:27017")
    db = client["meetmind_ai"]

    # Verify 'files' collection for PDF
    file_doc = db["files"].find_one({"file_id": pdf_id})
    assert file_doc is not None, "File was not saved to 'files' collection!"
    print(f"  ✓ MongoDB 'files' collection verified:")
    print(f"      file_name: {file_doc.get('file_name')}")
    print(f"      file_type: {file_doc.get('file_type')}")
    print(f"      uploaded_at: {file_doc.get('uploaded_at')}")
    assert file_doc["file_type"] == "pdf"

    # Verify 'extracted_text' collection for PDF
    extracted_doc = db["extracted_text"].find_one({"file_id": pdf_id})
    assert extracted_doc is not None, "Extracted text was not saved to 'extracted_text' collection!"
    print(f"  ✓ MongoDB 'extracted_text' collection verified:")
    print(f"      file_id: {extracted_doc.get('file_id')}")
    print(f"      file_name: {extracted_doc.get('file_name')}")
    print(f"      text snippet: {extracted_doc.get('text')[:80]}")
    assert len(extracted_doc.get("text", "")) > 0

    # Verify direct endpoint /api/extracted-text/{file_id}
    req = urllib.request.Request(f"{BASE_URL}/extracted-text/{pdf_id}", headers=headers)
    with urllib.request.urlopen(req) as res:
        ext_api = json.loads(res.read().decode())
        print(f"  ✓ Endpoint GET /api/extracted-text/{pdf_id} verified:")
        print(f"      returned text: '{ext_api.get('text')}'")

    # 3. PDF Summary Generation
    print("\n[Step 3] Testing AI Summary Generation for PDF...")
    sum_payload = json.dumps({
        "source_id": pdf_id,
        "source_type": "document",
        "style": "executive"
    }).encode('utf-8')
    req = urllib.request.Request(f"{BASE_URL}/summaries/generate", data=sum_payload, headers={**headers, "Content-Type": "application/json"})
    with urllib.request.urlopen(req) as res:
        sum_res = json.loads(res.read().decode())
        print(f"  ✓ Summary generated successfully!")
        print(f"      Model used: {sum_res.get('model_used')}")
        print(f"      Summary words: {sum_res.get('summary_word_count')}")

    # Verify 'summaries' collection in MongoDB
    summary_doc = db["summaries"].find_one({"file_id": pdf_id})
    assert summary_doc is not None, "Summary was not saved to 'summaries' collection!"
    print(f"  ✓ MongoDB 'summaries' collection verified:")
    print(f"      file_id: {summary_doc.get('file_id')}")
    print(f"      summary snippet: {summary_doc.get('summary')[:100]}...")
    print(f"      created_at: {summary_doc.get('created_at')}")

    # 4. Audio Upload & Whisper Transcript
    print("\n[Step 4] Testing Audio Upload Flow...")
    wav_fn = create_sample_wav()
    with open(wav_fn, "rb") as f:
        wav_bytes = f.read()

    body, ctype = make_multipart_body(
        {"title": "Verification Audio Recording"},
        {"file": (wav_fn, wav_bytes, "audio/wav")}
    )
    req = urllib.request.Request(f"{BASE_URL}/meetings/upload", data=body, headers={**headers, "Content-Type": ctype})
    with urllib.request.urlopen(req) as res:
        audio_res = json.loads(res.read().decode())
        audio_id = audio_res["_id"]
        print(f"  ✓ Audio uploaded successfully! ID: {audio_id}")
        print(f"  ✓ Duration: {audio_res.get('duration')}s")

    # Verify 'files' collection for Audio
    audio_file_doc = db["files"].find_one({"file_id": audio_id})
    assert audio_file_doc is not None, "Audio file was not saved to 'files' collection!"
    print(f"  ✓ MongoDB 'files' collection verified:")
    print(f"      file_name: {audio_file_doc.get('file_name')}")
    print(f"      file_type: {audio_file_doc.get('file_type')}")
    print(f"      uploaded_at: {audio_file_doc.get('uploaded_at')}")
    assert audio_file_doc["file_type"] == "audio"

    # Verify 'transcripts' collection for Audio
    trans_doc = db["transcripts"].find_one({"file_id": audio_id})
    assert trans_doc is not None, "Transcript was not saved to 'transcripts' collection!"
    print(f"  ✓ MongoDB 'transcripts' collection verified:")
    print(f"      file_id: {trans_doc.get('file_id')}")
    print(f"      file_name: {trans_doc.get('file_name')}")
    print(f"      transcript: '{trans_doc.get('transcript')}'")
    assert "transcript" in trans_doc

    # Verify direct endpoint /api/transcripts/{file_id}
    req = urllib.request.Request(f"{BASE_URL}/transcripts/{audio_id}", headers=headers)
    with urllib.request.urlopen(req) as res:
        trans_api = json.loads(res.read().decode())
        print(f"  ✓ Endpoint GET /api/transcripts/{audio_id} verified:")
        print(f"      returned transcript: '{trans_api.get('transcript')}'")

    # 5. Audio Summary Generation
    print("\n[Step 5] Testing AI Summary Generation for Audio...")
    sum_payload_audio = json.dumps({
        "source_id": audio_id,
        "source_type": "meeting",
        "style": "executive"
    }).encode('utf-8')
    req = urllib.request.Request(f"{BASE_URL}/summaries/generate", data=sum_payload_audio, headers={**headers, "Content-Type": "application/json"})
    with urllib.request.urlopen(req) as res:
        audio_sum_res = json.loads(res.read().decode())
        print(f"  ✓ Summary generated successfully!")
        print(f"      Model used: {audio_sum_res.get('model_used')}")
        print(f"      Summary words: {audio_sum_res.get('summary_word_count')}")

    # Verify 'summaries' collection in MongoDB for Audio
    audio_summary_doc = db["summaries"].find_one({"file_id": audio_id})
    assert audio_summary_doc is not None, "Audio summary was not saved to 'summaries' collection!"
    print(f"  ✓ MongoDB 'summaries' collection verified:")
    print(f"      file_id: {audio_summary_doc.get('file_id')}")
    print(f"      summary snippet: {audio_summary_doc.get('summary')[:100]}...")
    print(f"      created_at: {audio_summary_doc.get('created_at')}")

    # Cleanup local test files
    for fn in [pdf_fn, wav_fn]:
        if os.path.exists(fn):
            os.remove(fn)

    print("\n==================================================================")
    print("  🎉 ALL 3 MODULES VERIFIED 100% PERFECTLY!")
    print("  PDF Flow: Upload -> files -> extracted_text -> summaries")
    print("  Audio Flow: Upload -> files -> transcripts -> summaries")
    print("==================================================================")

if __name__ == "__main__":
    run_tests()
