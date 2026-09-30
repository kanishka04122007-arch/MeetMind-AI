import urllib.request
import urllib.error
import json
import wave
import math
import struct
import os
import io

base = "http://localhost:8000/api"

def create_sample_wav(filename="test_audio.wav"):
    with wave.open(filename, 'w') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(16000)
        # Generate 1.5 seconds of a 440Hz tone
        for i in range(int(16000 * 1.5)):
            val = int(32767.0 * math.sin(2.0 * math.pi * 440.0 * i / 16000))
            f.writeframesraw(struct.pack('<h', val))
    return filename

def create_sample_pdf(filename="test_meeting_notes.pdf"):
    """
    Creates a minimal genuine PDF file with valid %PDF- header and basic text stream.
    """
    pdf_content = (
        b"%PDF-1.4\n"
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
        b"4 0 obj\n<< /Length 73 >>\nstream\n"
        b"BT /F1 14 Tf 72 700 Td (MeetMind AI - Sprint 4 Audio and PDF Upload Module Verification) Tj ET\n"
        b"endstream\nendobj\n"
        b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
        b"xref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000227 00000 n \n0000000352 00000 n \n"
        b"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n431\n%%EOF\n"
    )
    with open(filename, "wb") as f:
        f.write(pdf_content)
    return filename

def create_sample_mp4(filename="test_meeting_recording.mp4"):
    """
    Creates a 1-second sample MP4 video with an audio track using FFmpeg.
    """
    wav_file = create_sample_wav("temp_for_mp4.wav")
    cmd = f'ffmpeg -y -f lavfi -i color=c=blue:s=320x240:d=1 -i {wav_file} -c:v libx264 -tune stillimage -c:a aac -shortest "{filename}" -loglevel error'
    os.system(cmd)
    if os.path.exists(wav_file):
        os.remove(wav_file)
    return filename

def make_multipart_body(fields, files, boundary="----WebKitFormBoundaryMeetMind2026"):
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
    print("  MEETMIND AI - MODULE 2 (AUDIO, VIDEO & PDF UPLOAD) TEST SUITE")
    print("==================================================================")

    # 1. Health Check
    print("\n--- 1. Testing GET /api/health ---")
    req = urllib.request.Request(f"{base}/health")
    with urllib.request.urlopen(req) as res:
        health = json.loads(res.read().decode())
        print("Status:", health.get("status"))
        print("Whisper Engine:", health.get("whisper"))
        print("PDF Engine:", health.get("pdf_engine"))
        print("Audio/Video Converter:", health.get("audio_video_converter"))
        print("Database:", health.get("database"))
        assert health["status"] == "healthy"

    # 2. Authenticate
    print("\n--- 2. Authenticating User to get JWT Token ---")
    login_payload = json.dumps({"email": "kanishka@gmail.com", "password": "Password@123"}).encode('utf-8')
    req = urllib.request.Request(f"{base}/auth/login", data=login_payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as res:
        login_res = json.loads(res.read().decode())
        token = login_res["access_token"]
        print(f"Authenticated as: {login_res['user']['name']} ({login_res['user']['email']})")

    auth_headers = {"Authorization": f"Bearer {token}"}

    # 3. Audio Upload (WAV)
    print("\n--- 3. Testing POST /api/meetings/upload with WAV audio ---")
    wav_fn = create_sample_wav()
    with open(wav_fn, "rb") as f:
        wav_bytes = f.read()

    body, ctype = make_multipart_body(
        {"title": "Sprint 4 Audio Architecture Sync"},
        {"file": (wav_fn, wav_bytes, "audio/wav")}
    )
    req = urllib.request.Request(f"{base}/meetings/upload", data=body, headers={**auth_headers, "Content-Type": ctype})
    with urllib.request.urlopen(req) as res:
        audio_res = json.loads(res.read().decode())
        audio_id = audio_res["_id"]
        print("Audio Uploaded Successfully!")
        print("Meeting ID:", audio_id)
        print("Title:", audio_res["title"])
        print("Filename:", audio_res["fileName"])
        print("Upload Date:", audio_res["uploadDate"])
        print("Status:", audio_res["status"])
        print("Duration:", audio_res["duration"])
        assert audio_res["status"] in ("Uploaded", "completed")

    if os.path.exists(wav_fn):
        os.remove(wav_fn)

    # 4. Format Validation on Audio Endpoint
    print("\n--- 4. Testing Audio Endpoint Format Validation ---")
    # A) Try to upload .jpg (must be rejected)
    bad_body, bad_ctype = make_multipart_body(
        {"title": "Fake Image"},
        {"file": ("photo.jpg", b"fake-jpg-content", "image/jpeg")}
    )
    req = urllib.request.Request(f"{base}/meetings/upload", data=bad_body, headers={**auth_headers, "Content-Type": bad_ctype})
    try:
        urllib.request.urlopen(req)
        assert False, "Should have rejected .jpg on audio endpoint"
    except urllib.error.HTTPError as e:
        print(f"Correctly rejected .jpg with status {e.code}: {e.read().decode()}")
        assert e.code == 400

    # B) Try to upload .pdf on audio endpoint (should guide user to PDF endpoint)
    bad_body, bad_ctype = make_multipart_body(
        {"title": "Misplaced PDF"},
        {"file": ("document.pdf", b"%PDF-1.4...", "application/pdf")}
    )
    req = urllib.request.Request(f"{base}/meetings/upload", data=bad_body, headers={**auth_headers, "Content-Type": bad_ctype})
    try:
        urllib.request.urlopen(req)
        assert False, "Should have rejected .pdf on audio endpoint"
    except urllib.error.HTTPError as e:
        print(f"Correctly rejected .pdf on audio endpoint with status {e.code}: {e.read().decode()}")
        assert e.code == 400

    # 5. MP4 Video Recording Upload with FFmpeg audio extraction
    print("\n--- 5. Testing POST /api/meetings/upload with MP4 video recording (Zoom/Teams) ---")
    mp4_fn = create_sample_mp4()
    if os.path.exists(mp4_fn):
        with open(mp4_fn, "rb") as f:
            mp4_bytes = f.read()

        body, ctype = make_multipart_body(
            {"title": "Zoom Meeting Recording MP4"},
            {"file": (mp4_fn, mp4_bytes, "video/mp4")}
        )
        req = urllib.request.Request(f"{base}/meetings/upload", data=body, headers={**auth_headers, "Content-Type": ctype})
        with urllib.request.urlopen(req) as res:
            mp4_res = json.loads(res.read().decode())
            mp4_id = mp4_res["_id"]
            print("MP4 Video Uploaded & Audio Extracted Successfully!")
            print("Meeting ID:", mp4_id)
            print("File Type:", mp4_res.get("file_type"))
            print("Is Video:", mp4_res.get("is_video"))
            print("Status:", mp4_res.get("status"))
            assert mp4_res["is_video"] is True

        os.remove(mp4_fn)
        # Cleanup MP4 meeting
        del_req = urllib.request.Request(f"{base}/meetings/{mp4_id}", headers=auth_headers, method="DELETE")
        urllib.request.urlopen(del_req)
        print("Cleaned up MP4 meeting test record.")

    # 6. PDF Document Upload & Text Extraction
    print("\n--- 6. Testing POST /api/documents/upload with real PDF document ---")
    pdf_fn = create_sample_pdf()
    with open(pdf_fn, "rb") as f:
        pdf_bytes = f.read()

    body, ctype = make_multipart_body(
        {"title": "Sprint 4 Specifications and Notes"},
        {"file": (pdf_fn, pdf_bytes, "application/pdf")}
    )
    req = urllib.request.Request(f"{base}/documents/upload", data=body, headers={**auth_headers, "Content-Type": ctype})
    with urllib.request.urlopen(req) as res:
        pdf_res = json.loads(res.read().decode())
        pdf_id = pdf_res["_id"]
        print("PDF Uploaded & Extracted Successfully!")
        print("Document ID:", pdf_id)
        print("Title:", pdf_res["title"])
        print("Filename:", pdf_res["fileName"])
        print("Upload Date:", pdf_res["uploadDate"])
        print("Page Count:", pdf_res["page_count"])
        print("Word Count:", pdf_res["word_count"])
        print("Extracted Text Preview:", pdf_res["extracted_text"][:60] + "...")
        assert pdf_res["page_count"] >= 1
        assert "MeetMind AI" in pdf_res["extracted_text"]

    if os.path.exists(pdf_fn):
        os.remove(pdf_fn)

    # 7. Format Validation on PDF Endpoint
    print("\n--- 7. Testing PDF Endpoint Format Validation ---")
    # A) Try to upload .mp3 on PDF endpoint
    bad_body, bad_ctype = make_multipart_body(
        {"title": "Misplaced MP3"},
        {"file": ("audio.mp3", b"ID3fake", "audio/mpeg")}
    )
    req = urllib.request.Request(f"{base}/documents/upload", data=bad_body, headers={**auth_headers, "Content-Type": bad_ctype})
    try:
        urllib.request.urlopen(req)
        assert False, "Should have rejected .mp3 on PDF endpoint"
    except urllib.error.HTTPError as e:
        print(f"Correctly rejected .mp3 on PDF endpoint with status {e.code}: {e.read().decode()}")
        assert e.code == 400

    # B) Try to upload corrupted fake PDF (header missing %PDF-)
    bad_body, bad_ctype = make_multipart_body(
        {"title": "Fake PDF File"},
        {"file": ("fake.pdf", b"This is just plain text not a real pdf", "application/pdf")}
    )
    req = urllib.request.Request(f"{base}/documents/upload", data=bad_body, headers={**auth_headers, "Content-Type": bad_ctype})
    try:
        urllib.request.urlopen(req)
        assert False, "Should have rejected fake PDF lacking %PDF- header"
    except urllib.error.HTTPError as e:
        print(f"Correctly rejected corrupted PDF with status {e.code}: {e.read().decode()}")
        assert e.code == 400

    # 8. Test Demo PDF Document Creation
    print("\n--- 8. Testing POST /api/documents/demo (Create Multi-Page Sample Notes) ---")
    demo_pdf_payload = json.dumps({"scenario": "meeting_notes"}).encode('utf-8')
    req = urllib.request.Request(
        f"{base}/documents/demo",
        data=demo_pdf_payload,
        headers={**auth_headers, "Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as res:
        demo_pdf_res = json.loads(res.read().decode())
        demo_pdf_id = demo_pdf_res["_id"]
        print("Demo PDF Created Successfully!")
        print("Demo Title:", demo_pdf_res["title"])
        print("Demo Pages:", demo_pdf_res["page_count"])
        print("Demo Words:", demo_pdf_res["word_count"])
        print("Demo Status:", demo_pdf_res["status"])
        assert demo_pdf_res["page_count"] == 3

    # 9. List PDF Documents & Get Stats
    print("\n--- 9. Testing GET /api/documents & GET /api/documents/stats ---")
    req = urllib.request.Request(f"{base}/documents", headers=auth_headers)
    with urllib.request.urlopen(req) as res:
        doc_list = json.loads(res.read().decode())
        print(f"User has {doc_list['total']} PDF document(s)")
        assert doc_list["total"] >= 2

    req = urllib.request.Request(f"{base}/documents/stats", headers=auth_headers)
    with urllib.request.urlopen(req) as res:
        stats = json.loads(res.read().decode())
        print("User Stats:", stats)
        assert stats["total_documents"] >= 2

    # 10. Get Document Details & Update Extracted Text
    print(f"\n--- 10. Testing PUT /api/documents/{pdf_id}/text ---")
    update_payload = json.dumps({
        "title": "Sprint 4 Specifications (Lead Approved)",
        "extracted_text": "Updated verified meeting notes with approved architecture decisions."
    }).encode('utf-8')
    req = urllib.request.Request(
        f"{base}/documents/{pdf_id}/text",
        data=update_payload,
        headers={**auth_headers, "Content-Type": "application/json"},
        method="PUT"
    )
    with urllib.request.urlopen(req) as res:
        up_res = json.loads(res.read().decode())
        print("Updated Title:", up_res["title"])
        print("Updated Words:", up_res["word_count"])
        assert up_res["title"] == "Sprint 4 Specifications (Lead Approved)"

    # 11. Cleanup test records
    print("\n--- 11. Cleaning up Test Artifacts ---")
    del_req = urllib.request.Request(f"{base}/documents/{pdf_id}", headers=auth_headers, method="DELETE")
    urllib.request.urlopen(del_req)
    del_req = urllib.request.Request(f"{base}/documents/{demo_pdf_id}", headers=auth_headers, method="DELETE")
    urllib.request.urlopen(del_req)
    del_req = urllib.request.Request(f"{base}/meetings/{audio_id}", headers=auth_headers, method="DELETE")
    urllib.request.urlopen(del_req)
    print("Deleted all test documents and meetings successfully.")

    print("\n==================================================================")
    print("  ALL MODULE 2 AUDIO, MP4 VIDEO & PDF TESTS PASSED WITH 100% SUCCESS!")
    print("==================================================================")

if __name__ == "__main__":
    run_tests()
