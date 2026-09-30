from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.security import decode_access_token
from app.database import get_users_collection

security_bearer = HTTPBearer(auto_error=False)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security_bearer)) -> dict:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token missing or invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    payload = decode_access_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or token is invalid. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    from bson import ObjectId
    users_col = get_users_collection()
    query = {"_id": user_id}
    if ObjectId.is_valid(user_id):
        query = {"$or": [{"_id": user_id}, {"_id": ObjectId(user_id)}]}
    user = await users_col.find_one(query)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account associated with this session no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user
