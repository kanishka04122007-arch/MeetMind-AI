from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime, timezone
from bson import ObjectId
from app.database import get_users_collection
from app.security import hash_password, verify_password, create_access_token
from app.models.user import (
    UserRegisterRequest,
    UserLoginRequest,
    UserProfileUpdateRequest,
    UserChangePasswordRequest,
    UserResponse,
    TokenResponse,
    MessageResponse
)
from app.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication & User Management"])

def format_user_doc(user_doc: dict) -> dict:
    """Format MongoDB document for UserResponse"""
    return {
        "_id": str(user_doc["_id"]),
        "name": user_doc.get("name", ""),
        "email": user_doc.get("email", ""),
        "createdAt": str(user_doc.get("createdAt", datetime.now(timezone.utc).strftime("%Y-%m-%d"))),
        "phone": user_doc.get("phone"),
        "role": user_doc.get("role", "Member")
    }

@router.post(
    "/register",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user"
)
async def register_user(request: UserRegisterRequest):
    users_col = get_users_collection()
    normalized_email = request.email.lower().strip()
    
    # Check if user already exists
    existing_user = await users_col.find_one({"email": normalized_email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please log in instead."
        )
    
    # Hash password securely using bcrypt
    hashed_pwd = hash_password(request.password)
    
    # Current date formatted as YYYY-MM-DD
    current_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    new_user_id = str(ObjectId())
    user_document = {
        "_id": new_user_id,
        "name": request.name.strip(),
        "email": normalized_email,
        "password": hashed_pwd,
        "createdAt": current_date,
        "phone": None,
        "role": "Member"
    }
    
    # Save user details in MongoDB
    try:
        await users_col.insert_one(user_document)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error while saving user: {str(e)}"
        )
    
    return {
        "message": "Account Created Successfully",
        "user": format_user_doc(user_document)
    }

@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate existing user"
)
async def login_user(request: UserLoginRequest):
    users_col = get_users_collection()
    normalized_email = request.email.lower().strip()
    
    # Query user from MongoDB
    user = await users_col.find_one({"email": normalized_email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please check your credentials."
        )
    
    # Verify password against hashed password in database
    is_valid = verify_password(request.password, user.get("password", ""))
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please check your credentials."
        )
    
    # Generate JWT Token with user details
    token_payload = {
        "sub": str(user["_id"]),
        "email": user["email"],
        "name": user["name"]
    }
    access_token = create_access_token(data=token_payload)
    
    formatted_user = format_user_doc(user)
    
    return {
        "message": "Login Successful",
        "welcome_message": "Welcome to MeetMind AI Dashboard",
        "access_token": access_token,
        "token_type": "bearer",
        "user": formatted_user
    }

@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user profile"
)
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    return format_user_doc(current_user)

@router.put(
    "/profile",
    response_model=MessageResponse,
    summary="Update user profile details"
)
async def update_profile(
    update_data: UserProfileUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    users_col = get_users_collection()
    update_fields = {}
    
    if update_data.name is not None and update_data.name.strip():
        update_fields["name"] = update_data.name.strip()
    if update_data.phone is not None:
        update_fields["phone"] = update_data.phone.strip()
    if update_data.role is not None:
        update_fields["role"] = update_data.role.strip()
        
    if not update_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid fields provided for profile update."
        )
    
    await users_col.update_one(
        {"_id": current_user["_id"]},
        {"$set": update_fields}
    )
    
    updated_user = await users_col.find_one({"_id": current_user["_id"]})
    return {
        "message": "Profile updated successfully",
        "user": format_user_doc(updated_user)
    }

@router.post(
    "/change-password",
    response_model=MessageResponse,
    summary="Change account password"
)
async def change_password(
    pwd_data: UserChangePasswordRequest,
    current_user: dict = Depends(get_current_user)
):
    users_col = get_users_collection()
    
    # Verify current password
    is_valid = verify_password(pwd_data.current_password, current_user.get("password", ""))
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect. Please try again."
        )
    
    # Hash new password
    new_hashed_pwd = hash_password(pwd_data.new_password)
    
    # Update password in MongoDB
    await users_col.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"password": new_hashed_pwd}}
    )
    
    return {
        "message": "Password changed successfully"
    }

@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Securely log out user"
)
async def logout_user(current_user: dict = Depends(get_current_user)):
    # Server acknowledgment for session termination
    return {
        "message": "Logged out successfully"
    }
