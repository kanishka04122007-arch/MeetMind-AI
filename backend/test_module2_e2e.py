import urllib.request
import urllib.error
import json
import wave
import math
import struct
import os

base = "http://localhost:8000/api"

def create_sample_wav(filename="temp_e2e_test.wav"):
    with wave.open(filename, 'w') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(16000)
        # Generate 2 seconds of audio
        for i in range(16000 * 2):
            value = int(32767.0 * math.sin(2.0 * math.pi * 440.0 * i / 16000))
            data = struct.pack('<h', value)
            f.writeframesraw(data)
    return filename

def run_e2e_tests():
    print("==================================================")
    print("  MEETMIND AI - MODULE 1 & 2 E2E TEST SUITE")
    print("==================================================")

    # 1. Health check
    print("\n--- 1. Testing Health Endpoint ---")
    req = urllib.request.Request(f"{base}/health")
    with urllib.request.urlopen(req) as res:
        health = json.loads(res.read().decode())
        print("Health Status:", health.get("status"))
        print("Whisper Engine:", health.get("whisper"))
        print("Database Status:", health.get("database"))

    # 2. Login to get JWT
    print("\n--- 2. Authenticating User to obtain Bearer Token ---")
    login_payload = {
        "email": "kanishka@gmail.com",
        "password": "Password@123"
    }
    login_data = json.dumps(login_payload).encode('utf-8')
    req = urllib.request.Request(
        f"{base}/auth/login",
        data=login_data,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as res:
        login_resp = json.loads(res.read().decode())
        token = login_resp["access_token"]
        print(f"Logged in as: {login_resp['user']['name']} ({login_resp['user']['email']})")
        print(f"JWT Token length: {len(token)}")

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # 3. Create Demo Meeting
    print("\n--- 3. Testing POST /meetings/demo (Create Demo Scenario) ---")
    demo_payload = {
        "scenario": "sprint_planning",
        "title": "E2E Test Sprint Planning"
    }
    req = urllib.request.Request(
        f"{base}/meetings/demo",
        data=json.dumps(demo_payload).encode('utf-8'),
        headers=headers
    )
    with urllib.request.urlopen(req) as res:
        demo_meeting = json.loads(res.read().decode())
        demo_id = demo_meeting["_id"]
        print("Created Demo Meeting ID:", demo_id)
        print("Title:", demo_meeting["title"])
        print("Segments Count:", len(demo_meeting["segments"]))
        print("Transcript preview:", demo_meeting["transcript_text"][:60] + "...")

    # 4. List Meetings
    print("\n--- 4. Testing GET /meetings (List User Meetings) ---")
    req = urllib.request.Request(f"{base}/meetings", headers=headers)
    with urllib.request.urlopen(req) as res:
        meetings_resp = json.loads(res.read().decode())
        print(f"Found {meetings_resp['total']} meeting(s) in user library")
        assert meetings_resp["total"] >= 1, "Expected at least 1 meeting in list"

    # 5. Get Meeting Details
    print(f"\n--- 5. Testing GET /meetings/{demo_id} ---")
    req = urllib.request.Request(f"{base}/meetings/{demo_id}", headers=headers)
    with urllib.request.urlopen(req) as res:
        detail = json.loads(res.read().decode())
        print("Fetched meeting details successfully:", detail["title"])
        assert detail["_id"] == demo_id

    # 6. Update Transcript
    print(f"\n--- 6. Testing PUT /meetings/{demo_id}/transcript ---")
    update_payload = {
        "title": "E2E Test Sprint Planning (Updated Title)",
        "transcript_text": "Updated custom transcript text for verification."
    }
    req = urllib.request.Request(
        f"{base}/meetings/{demo_id}/transcript",
        data=json.dumps(update_payload).encode('utf-8'),
        headers=headers,
        method="PUT"
    )
    with urllib.request.urlopen(req) as res:
        updated = json.loads(res.read().decode())
        print("Updated Title:", updated["title"])
        print("Updated Text:", updated["transcript_text"])
        assert updated["title"] == "E2E Test Sprint Planning (Updated Title)"

    # 7. Upload Audio File (Multipart/form-data)
    print("\n--- 7. Testing POST /meetings/upload with real WAV audio ---")
    wav_filename = create_sample_wav()
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    
    with open(wav_filename, "rb") as f:
        file_bytes = f.read()

    body = bytearray()
    # file field
    body.extend(f"--{boundary}\r\n".encode())
    body.extend(f'Content-Disposition: form-data; name="file"; filename="{wav_filename}"\r\n'.encode())
    body.extend(b"Content-Type: audio/wav\r\n\r\n")
    body.extend(file_bytes)
    body.extend(b"\r\n")
    # title field
    body.extend(f"--{boundary}\r\n".encode())
    body.extend(b'Content-Disposition: form-data; name="title"\r\n\r\n')
    body.extend(b"E2E Audio Upload Test\r\n")
    # end boundary
    body.extend(f"--{boundary}--\r\n".encode())

    req = urllib.request.Request(
        f"{base}/meetings/upload",
        data=bytes(body),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": f"multipart/form-data; boundary={boundary}"
        }
    )
    with urllib.request.urlopen(req) as res:
        upload_resp = json.loads(res.read().decode())
        uploaded_id = upload_resp["_id"]
        stored_file = upload_resp["file_url"]
        print("Audio Uploaded and Transcribed Successfully!")
        print("Uploaded Meeting ID:", uploaded_id)
        print("Duration:", upload_resp["duration"], "seconds")
        print("Whisper Status:", upload_resp["status"])
        print("Language:", upload_resp["language"])
        print("File Stream URL:", stored_file)
        print("Segments:", upload_resp["segments"])
        assert upload_resp["status"] in ("completed", "Uploaded")

    # 8. Test Audio Streaming
    print(f"\n--- 8. Testing GET {stored_file} (Audio Streaming) ---")
    stream_url = f"http://localhost:8000{stored_file}"
    req = urllib.request.Request(stream_url)
    with urllib.request.urlopen(req) as res:
        audio_streamed = res.read()
        print("Streamed audio bytes:", len(audio_streamed))
        assert len(audio_streamed) == len(file_bytes)

    # 9. Cleanup uploaded meeting
    print(f"\n--- 9. Testing DELETE /meetings/{uploaded_id} ---")
    req = urllib.request.Request(
        f"{base}/meetings/{uploaded_id}",
        headers={"Authorization": f"Bearer {token}"},
        method="DELETE"
    )
    with urllib.request.urlopen(req) as res:
        del_resp = json.loads(res.read().decode())
        print("Deleted meeting result:", del_resp["message"])

    # Cleanup local WAV file
    if os.path.exists(wav_filename):
        os.remove(wav_filename)

    print("\n==================================================")
    print("  ALL MODULE 1 & 2 E2E TESTS PASSED WITH 100% SUCCESS!")
    print("==================================================")

if __name__ == "__main__":
    run_e2e_tests()
