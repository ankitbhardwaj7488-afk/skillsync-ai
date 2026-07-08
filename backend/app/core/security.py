from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)


def create_token(subject: str, token_type: str, expires: timedelta) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode({"sub": subject, "type": token_type, "iat": now, "exp": now + expires}, settings.secret_key, algorithm=ALGORITHM)


def create_access_token(subject: str) -> str:
    return create_token(subject, "access", timedelta(minutes=settings.access_token_minutes))


def create_refresh_token(subject: str) -> str:
    return create_token(subject, "refresh", timedelta(days=settings.refresh_token_days))


def create_oauth_state(payload: dict) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode({**payload, "type": "oauth_state", "iat": now, "exp": now + timedelta(minutes=10)}, settings.secret_key, algorithm=ALGORITHM)


def decode_oauth_state(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        if payload.get("type") != "oauth_state":
            raise JWTError("Invalid state")
        return payload
    except JWTError as exc:
        raise ValueError("Invalid or expired OAuth state") from exc


def decode_token(token: str, expected_type: str = "access") -> str:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        if payload.get("type") != expected_type or not payload.get("sub"):
            raise JWTError("Invalid token")
        return str(payload["sub"])
    except JWTError as exc:
        raise ValueError("Invalid or expired token") from exc
