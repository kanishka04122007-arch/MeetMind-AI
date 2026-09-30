from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import Optional
from datetime import datetime

class UserRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="User's full name", examples=["Kanishka R"])
    email: EmailStr = Field(..., description="User's email address", examples=["kanishka@gmail.com"])
    password: str = Field(..., min_length=6, max_length=128, description="User's password")
    confirm_password: str = Field(..., min_length=6, max_length=128, description="Confirm password")

    @model_validator(mode="after")
    def check_passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Password and Confirm Password do not match.")
        return self

class UserLoginRequest(BaseModel):
    email: EmailStr = Field(..., description="User's registered email address", examples=["kanishka@gmail.com"])
    password: str = Field(..., min_length=1, description="User's password")

class UserProfileUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100, description="Updated full name")
    phone: Optional[str] = Field(None, max_length=20, description="Optional contact number")
    role: Optional[str] = Field(None, max_length=50, description="User designation or department")

class UserChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, description="Current password")
    new_password: str = Field(..., min_length=6, max_length=128, description="New password")
    confirm_new_password: str = Field(..., min_length=6, max_length=128, description="Confirm new password")

    @model_validator(mode="after")
    def check_new_passwords_match(self):
        if self.new_password != self.confirm_new_password:
            raise ValueError("New Password and Confirm New Password do not match.")
        if self.current_password == self.new_password:
            raise ValueError("New Password cannot be the same as the current password.")
        return self

class UserResponse(BaseModel):
    id: str = Field(..., alias="_id", description="Unique user identifier")
    name: str
    email: EmailStr
    createdAt: str
    phone: Optional[str] = None
    role: Optional[str] = "Member"

    class Config:
        populate_by_name = True

class TokenResponse(BaseModel):
    message: str = "Login Successful"
    welcome_message: str = "Welcome to MeetMind AI Dashboard"
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class MessageResponse(BaseModel):
    message: str
    user: Optional[UserResponse] = None
