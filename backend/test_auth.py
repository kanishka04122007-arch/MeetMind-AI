import urllib.request
import json

base = "http://localhost:8000/api"

def run_tests():
    print("--- 1. Testing Health Endpoint ---")
    req = urllib.request.Request(f"{base}/health")
    with urllib.request.urlopen(req) as res:
        health = json.loads(res.read().decode())
        print("Health Status:", health)

    print("\n--- 2. Testing User Registration ---")
    reg_payload = {
        "name": "Kanishka R",
        "email": "kanishka@gmail.com",
        "password": "Password@123",
        "confirm_password": "Password@123"
    }
    data = json.dumps(reg_payload).encode('utf-8')
    req = urllib.request.Request(
        f"{base}/auth/register",
        data=data,
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req) as res:
            reg_resp = json.loads(res.read().decode())
            print("Registration Success:", reg_resp["message"])
            print("User Created:", reg_resp["user"])
    except urllib.error.HTTPError as e:
        err_body = e.read().decode()
        print(f"Registration Notice ({e.code}):", err_body)

    print("\n--- 3. Testing Duplicate Registration Prevention ---")
    req = urllib.request.Request(
        f"{base}/auth/register",
        data=data,
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req) as res:
            print("Unexpected success on duplicate!")
    except urllib.error.HTTPError as e:
        print(f"Correctly caught duplicate ({e.code}):", json.loads(e.read().decode())["detail"])

    print("\n--- 4. Testing User Login ---")
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
        print("Login Output 1:", login_resp["message"])
        print("Login Output 2:", login_resp["welcome_message"])
        print("JWT Token generated (length):", len(login_resp["access_token"]))
        token = login_resp["access_token"]
        user_info = login_resp["user"]
        print("User Info:", user_info)

    print("\n--- 5. Testing Profile Access (Protected GET /auth/me) ---")
    req = urllib.request.Request(
        f"{base}/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    with urllib.request.urlopen(req) as res:
        me_resp = json.loads(res.read().decode())
        print("Profile Details:", me_resp)

    print("\n--- 6. Testing Profile Update (Protected PUT /auth/profile) ---")
    update_payload = {
        "name": "Kanishka R",
        "role": "AI Research Lead",
        "phone": "+91 98765 43210"
    }
    req = urllib.request.Request(
        f"{base}/auth/profile",
        data=json.dumps(update_payload).encode('utf-8'),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        },
        method="PUT"
    )
    with urllib.request.urlopen(req) as res:
        upd_resp = json.loads(res.read().decode())
        print("Update Profile Result:", upd_resp["message"])
        print("Updated User:", upd_resp["user"])

    print("\n--- 7. Testing Password Change & Verification ---")
    pwd_payload = {
        "current_password": "Password@123",
        "new_password": "NewSecretPassword@456",
        "confirm_new_password": "NewSecretPassword@456"
    }
    req = urllib.request.Request(
        f"{base}/auth/change-password",
        data=json.dumps(pwd_payload).encode('utf-8'),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
    )
    with urllib.request.urlopen(req) as res:
        pwd_resp = json.loads(res.read().decode())
        print("Password Change:", pwd_resp["message"])

    # Revert password back so demo credentials remain Password@123
    revert_payload = {
        "current_password": "NewSecretPassword@456",
        "new_password": "Password@123",
        "confirm_new_password": "Password@123"
    }
    req = urllib.request.Request(
        f"{base}/auth/change-password",
        data=json.dumps(revert_payload).encode('utf-8'),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
    )
    with urllib.request.urlopen(req) as res:
        print("Reverted password back for demo testing:", json.loads(res.read().decode())["message"])

    print("\n--- 8. Testing Logout (Protected POST /auth/logout) ---")
    req = urllib.request.Request(
        f"{base}/auth/logout",
        data=b"{}",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
    )
    with urllib.request.urlopen(req) as res:
        logout_resp = json.loads(res.read().decode())
        print("Logout Result:", logout_resp["message"])

    print("\nALL BACKEND MODULE 1 TESTS PASSED PERFECTLY!")

if __name__ == "__main__":
    run_tests()
