from app.routers.auth import router as auth_router
from app.routers.meetings import router as meetings_router
from app.routers.documents import router as documents_router

__all__ = ["auth_router", "meetings_router", "documents_router"]
