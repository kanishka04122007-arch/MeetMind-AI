import urllib.request
import json
import os
import sys

base = "http://localhost:8000/api"

def run_module3_tests():
    print("==================================================")
    print("MODULE 3 – AI SUMMARY GENERATION VERIFICATION TEST")
    print("==================================================")

    # 1. Login to get JWT
    print("\n--- 1. Authenticating User ---")
    login_payload = {
        "email": "kanishka@gmail.com",
        "password": "Password@123"
    }
    req = urllib.request.Request(
        f"{base}/auth/login",
        data=json.dumps(login_payload).encode('utf-8'),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as res:
        login_resp = json.loads(res.read().decode())
        token = login_resp["access_token"]
        print("[OK] Authenticated successfully. Token obtained.")

    auth_headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }

    # 2. Create a demo meeting to summarize
    print("\n--- 2. Creating Demo Meeting Recording for Summary ---")
    demo_req = urllib.request.Request(
        f"{base}/meetings/demo",
        data=json.dumps({
            "scenario": "sprint_planning",
            "title": "Module 3 Sprint Planning & Architecture Sync"
        }).encode('utf-8'),
        headers=auth_headers
    )
    with urllib.request.urlopen(demo_req) as res:
        meeting = json.loads(res.read().decode())
        meeting_id = meeting["_id"]
        print(f"[OK] Meeting created with ID: {meeting_id}")
        print(f"     Title: {meeting['title']}")
        print(f"     Transcript Length: {len(meeting['transcript_text'].split())} words")

    # 3. Generate AI Summary from Meeting Transcript
    print("\n--- 3. Testing AI Summary Generation from Audio Transcript ---")
    summary_req_payload = {
        "source_id": meeting_id,
        "source_type": "meeting",
        "style": "executive"
    }
    req = urllib.request.Request(
        f"{base}/summaries/generate",
        data=json.dumps(summary_req_payload).encode('utf-8'),
        headers=auth_headers
    )
    with urllib.request.urlopen(req) as res:
        summary_resp = json.loads(res.read().decode())
        summary_id = summary_resp["_id"]
        print(f"[OK] AI Summary Generated! ID: {summary_id}")
        print(f"     Model Used: {summary_resp['model_used']}")
        print(f"     Original Words: {summary_resp['original_word_count']}")
        print(f"     Summary Words: {summary_resp['summary_word_count']}")
        print(f"     Compression Ratio: {summary_resp['compression_ratio']}% reduction")
        print(f"     Reading Time Saved: ~{summary_resp['reading_time_saved_mins']} mins")
        
        structured = summary_resp["structured_data"]
        print("\n[Structured Output Inspection]")
        print("  - Overview:", structured.get("overview")[:120], "...")
        print("  - Key Points Count:", len(structured.get("key_points", [])))
        print("  - Decisions Count:", len(structured.get("decisions", [])))
        print("  - Action Items Count:", len(structured.get("action_items", [])))
        for i, act in enumerate(structured.get("action_items", [])[:3]):
            print(f"    * [{act.get('owner')}] {act.get('task')} (Deadline: {act.get('deadline')})")

    # 4. Create a demo PDF document to summarize
    print("\n--- 4. Creating Demo PDF Document for Summary ---")
    doc_demo_req = urllib.request.Request(
        f"{base}/documents/demo",
        data=json.dumps({
            "scenario": "meeting_notes",
            "title": "Q3 Engineering Roadmap & Architecture Document"
        }).encode('utf-8'),
        headers=auth_headers
    )
    with urllib.request.urlopen(doc_demo_req) as res:
        doc = json.loads(res.read().decode())
        doc_id = doc["_id"]
        print(f"[OK] PDF Document created with ID: {doc_id}")
        print(f"     Pages: {doc['page_count']} | Words: {doc['word_count']}")

    # 5. Generate AI Summary from PDF Document Text
    print("\n--- 5. Testing AI Summary Generation from PDF Text ---")
    pdf_summary_payload = {
        "source_id": doc_id,
        "source_type": "document",
        "style": "action_focused"
    }
    req = urllib.request.Request(
        f"{base}/summaries/generate",
        data=json.dumps(pdf_summary_payload).encode('utf-8'),
        headers=auth_headers
    )
    with urllib.request.urlopen(req) as res:
        pdf_summary = json.loads(res.read().decode())
        print(f"[OK] PDF AI Summary Generated! ID: {pdf_summary['_id']}")
        print(f"     Original Words: {pdf_summary['original_word_count']}")
        print(f"     Summary Words: {pdf_summary['summary_word_count']}")
        print(f"     Compression Ratio: {pdf_summary['compression_ratio']}% reduction")
        print(f"     Reading Time Saved: ~{pdf_summary['reading_time_saved_mins']} mins")

    # 6. Test Aggregate Summary Stats Endpoint
    print("\n--- 6. Testing Summary Statistics Overview ---")
    req = urllib.request.Request(
        f"{base}/summaries/stats/overview",
        headers={"Authorization": f"Bearer {token}"}
    )
    with urllib.request.urlopen(req) as res:
        stats = json.loads(res.read().decode())
        print("[OK] Stats retrieved:")
        print(f"     Total Summaries: {stats['total_summaries']}")
        print(f"     Total Original Words: {stats['total_original_words']}")
        print(f"     Total Summary Words: {stats['total_summary_words']}")
        print(f"     Avg Compression Ratio: {stats['avg_compression_ratio']}%")
        print(f"     Total Reading Time Saved: ~{stats['total_reading_time_saved_mins']} mins")

    # 7. Test PDF Report Download Endpoint
    print("\n--- 7. Testing Summary PDF Report Generation & Download ---")
    req = urllib.request.Request(
        f"{base}/summaries/{summary_id}/pdf",
        headers={"Authorization": f"Bearer {token}"}
    )
    with urllib.request.urlopen(req) as res:
        pdf_bytes = res.read()
        print(f"[OK] Downloaded PDF Summary: {len(pdf_bytes)} bytes | Header: {pdf_bytes[:4]}")
        assert pdf_bytes.startswith(b"%PDF"), "Response is not a valid PDF file"

    # 8. Test TXT Summary Download Endpoint
    print("\n--- 8. Testing Summary TXT Export ---")
    req = urllib.request.Request(
        f"{base}/summaries/{summary_id}/txt",
        headers={"Authorization": f"Bearer {token}"}
    )
    with urllib.request.urlopen(req) as res:
        txt_content = res.read().decode('utf-8')
        print(f"[OK] Downloaded TXT Summary ({len(txt_content)} chars)")
        print("     Snippet (ASCII clean):", txt_content[:150].encode('ascii', 'replace').decode('ascii'))

    print("\n==================================================")
    print("ALL MODULE 3 DELIVERABLES VERIFIED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    run_module3_tests()
