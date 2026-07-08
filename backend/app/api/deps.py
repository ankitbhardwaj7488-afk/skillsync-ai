from fastapi import Cookie, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import decode_token
from app.database.session import get_db
from app.models.entities import Role, User

bearer = HTTPBearer(auto_error=False)


async def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), access_token: str | None = Cookie(None), db: AsyncSession = Depends(get_db)) -> User:
    raw_token = credentials.credentials if credentials else access_token
    if not raw_token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Authentication required")
    try:
        user_id = decode_token(raw_token)
    except ValueError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    user = await db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return user


async def optional_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), access_token: str | None = Cookie(None), db: AsyncSession = Depends(get_db)) -> User | None:
    raw_token = credentials.credentials if credentials else access_token
    if not raw_token:
        return None
    try:
        return await db.get(User, decode_token(raw_token))
    except ValueError:
        return None


def require_roles(*roles: Role):
    async def dependency(user: User = Depends(current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient permissions")
        return user
    return dependency
