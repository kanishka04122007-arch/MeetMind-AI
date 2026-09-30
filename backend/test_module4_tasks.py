import requests
import sys
import json

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_URL = "http://127.0.0.1:8000/api"

def main():
    print("=" * 60)
    print("TESTING MODULE 4: ACTION ITEM EXTRACTION & TASK MANAGEMENT")
    print("=" * 60)

    # 1. Login
    print("\n1. Authenticating as kanishka@gmail.com...")
    login_res = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "kanishka@gmail.com",
        "password": "Password@123"
    })
    
    if login_res.status_code != 200:
        print(f"❌ Login failed: {login_res.status_code} {login_res.text}")
        sys.exit(1)

    token = login_res.json()["access_token"]
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    print("✅ Authenticated successfully.")

    # 2. Extract action items from a meeting discussion
    sample_transcript = """
    Sarah: Welcome everyone. Let's cover our action items for Sprint 4.
    Alex, you need to finalize the MongoDB action item schemas and indexing by Friday 5 PM. This is critical.
    Alex: Got it, I will optimize the compound indexes for user_id and status.
    Sarah: Priya, please design the Figma UI cards and task filter components by next Monday.
    Priya: Sure Sarah, I'll make sure priority badges and status tags are styled cleanly.
    Sarah: I will review the API security headers and finalize the deployment script before Wednesday afternoon.
    David should also update the developer documentation by end of this week.
    """

    print("\n2. Testing POST /api/action-items/extract...")
    extract_res = requests.post(f"{BASE_URL}/action-items/extract", headers=headers, json={
        "text": sample_transcript,
        "source_type": "meeting",
        "source_title": "Sprint 4 Planning & Task Extraction Test",
        "source_id": "test-meeting-sprint-4"
    })

    if extract_res.status_code not in [200, 201]:
        print(f"❌ Extraction failed: {extract_res.status_code} {extract_res.text}")
        sys.exit(1)

    extract_data = extract_res.json()
    extracted_items = extract_data.get("tasks", [])
    model_used = extracted_items[0].get("model_used") if extracted_items else "Unknown"
    print(f"✅ Extracted {len(extracted_items)} action items using model: {model_used}")
    
    for i, item in enumerate(extracted_items, 1):
        print(f"   [{i}] Task: {item['task']}")
        print(f"       Assigned: {item['assigned_to']} | Deadline: {item['deadline']} | Priority: {item['priority']} | Status: {item['status']}")

    if len(extracted_items) == 0:
        print("❌ Expected at least 1 extracted task!")
        sys.exit(1)

    target_task = extracted_items[0]
    task_id = target_task.get("id") or target_task.get("_id")

    # 3. Test GET /api/action-items (List all)
    print("\n3. Testing GET /api/action-items...")
    list_res = requests.get(f"{BASE_URL}/action-items", headers=headers)
    assert list_res.status_code == 200, f"List failed: {list_res.text}"
    all_tasks = list_res.json().get("tasks", [])
    print(f"✅ Total tasks returned: {len(all_tasks)}")

    # 4. Test Search filter
    print("\n4. Testing GET /api/action-items with search query...")
    search_term = target_task.get("assigned_to", "Alex")
    search_res = requests.get(f"{BASE_URL}/action-items?search={search_term}", headers=headers)
    assert search_res.status_code == 200
    matched = search_res.json().get("tasks", [])
    print(f"✅ Search for '{search_term}' returned {len(matched)} match(es)")

    # 5. Test Priority & Status filter
    print("\n5. Testing GET /api/action-items with status filter...")
    status_res = requests.get(f"{BASE_URL}/action-items?status=Pending", headers=headers)
    assert status_res.status_code == 200
    print(f"✅ Filter status=Pending returned {len(status_res.json().get('tasks', []))} tasks")

    # 6. Test PUT /api/action-items/{task_id} (Update status & fields)
    print(f"\n6. Testing PUT /api/action-items/{task_id}...")
    update_res = requests.put(f"{BASE_URL}/action-items/{task_id}", headers=headers, json={
        "status": "In Progress",
        "priority": "High",
        "deadline": "Friday 5 PM"
    })
    assert update_res.status_code == 200, f"Update failed: {update_res.text}"
    updated_item = update_res.json()
    print(f"✅ Updated task status to: {updated_item['status']}, priority: {updated_item['priority']}")
    assert updated_item["status"] == "In Progress"

    # Toggle to Completed
    toggle_res = requests.put(f"{BASE_URL}/action-items/{task_id}", headers=headers, json={
        "status": "Completed"
    })
    assert toggle_res.status_code == 200
    print(f"✅ Task toggled to: {toggle_res.json()['status']}")

    # 7. Test Manual Task Creation: POST /api/action-items
    print("\n7. Testing manual POST /api/action-items...")
    manual_res = requests.post(f"{BASE_URL}/action-items", headers=headers, json={
        "task": "Prepare final Viva documentation and presentation slides",
        "assigned_to": "Kanishka",
        "deadline": "End of week",
        "priority": "High",
        "status": "Pending",
        "source_type": "manual"
    })
    assert manual_res.status_code in [200, 201], f"Create manual task failed: {manual_res.text}"
    manual_task = manual_res.json()
    manual_id = manual_task.get("id") or manual_task.get("_id")
    print(f"✅ Created manual task ID: {manual_id} - '{manual_task['task']}'")

    # 8. Test GET /api/action-items/stats
    print("\n8. Testing GET /api/action-items/stats...")
    stats_res = requests.get(f"{BASE_URL}/action-items/stats", headers=headers)
    assert stats_res.status_code == 200, f"Stats failed: {stats_res.text}"
    stats = stats_res.json()
    print("✅ Dashboard Statistics:")
    print(f"   Total Tasks: {stats['total_tasks']}")
    print(f"   Pending: {stats['pending_tasks']}")
    print(f"   In Progress: {stats['in_progress_tasks']}")
    print(f"   Completed: {stats['completed_tasks']}")
    print(f"   High Priority: {stats['high_priority_tasks']}")
    print(f"   Completion Rate: {stats['completion_rate']}%")

    # 9. Test DELETE /api/action-items/{task_id}
    print(f"\n9. Testing DELETE /api/action-items/{manual_id}...")
    del_res = requests.delete(f"{BASE_URL}/action-items/{manual_id}", headers=headers)
    assert del_res.status_code == 200, f"Delete failed: {del_res.text}"
    print("✅ Manual task deleted successfully.")

    print("\n" + "=" * 60)
    print("🎉 ALL MODULE 4 BACKEND ENDPOINTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    main()
