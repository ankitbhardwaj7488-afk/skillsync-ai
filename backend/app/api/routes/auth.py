import secrets
from urllib.parse import urlencode
from fastapi import APIRouter, Cookie, Depends, HTTPException, Query, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import current_user
from app.core.config import settings
from app.core.security import create_access_token, create_oauth_state, create_refresh_token, decode_oauth_state, decode_token, hash_password, verify_password
from app.database.session import get_db
from app.models.entities import Role, User
from app.schemas.api import LoginRequest, RefreshRequest, TokenPair, UserCreate, UserOut
from app.services.oauth import authorization_url, exchange_code, provider_config

router = APIRouter(prefix="/auth", tags=["Authentication"])


def tokens(user: User) -> TokenPair:
    return TokenPair(access_token=create_access_token(user.id), refresh_token=create_refresh_token(user.id), user=UserOut.model_validate(user))


def set_auth_cookies(response: Response, pair: TokenPair) -> None:
    common = {"httponly": True, "secure": settings.secure_cookies, "samesite": "lax", "path": "/"}
    response.set_cookie("access_token", pair.access_token, max_age=settings.access_token_minutes * 60, **common)
    response.set_cookie("refresh_token", pair.refresh_token, max_age=settings.refresh_token_days * 86400, **common)


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie("access_token", path="/", secure=settings.secure_cookies, httponly=True, samesite="lax")
    response.delete_cookie("refresh_token", path="/", secure=settings.secure_cookies, httponly=True, samesite="lax")


@router.post("/register", response_model=TokenPair, status_code=201)
async def register(data: UserCreate, response: Response, db: AsyncSession = Depends(get_db)):
    if await db.scalar(select(User).where(User.email == data.email.lower())):
        raise HTTPException(409, "An account with this email already exists")
    user = User(email=data.email.lower(), full_name=data.full_name.strip(), password_hash=hash_password(data.password), role=data.role)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    pair = tokens(user); set_auth_cookies(response, pair); return pair


@router.post("/login", response_model=TokenPair)
async def login(data: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    user = await db.scalar(select(User).where(User.email == data.email.lower()))
    if not user or user.password_hash.startswith("!oauth:") or not verify_password(data.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    pair = tokens(user); set_auth_cookies(response, pair); return pair


@router.post("/refresh-token", response_model=TokenPair)
async def refresh(data: RefreshRequest | None = None, response: Response = None, refresh_token: str | None = Cookie(None), db: AsyncSession = Depends(get_db)):
    raw_refresh = data.refresh_token if data else refresh_token
    if not raw_refresh:
        raise HTTPException(401, "Refresh token required")
    try:
        user_id = decode_token(raw_refresh, "refresh")
    except ValueError:
        raise HTTPException(401, "Invalid refresh token")
    user = await db.get(User, user_id)
    if not user: raise HTTPException(401, "User no longer exists")
    pair = tokens(user); set_auth_cookies(response, pair); return pair


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(current_user)):
    return user


@router.post("/forgot-password")
async def forgot_password():
    return {"message": "If that account exists, reset instructions have been sent."}


@router.post("/logout", status_code=204)
async def logout(response: Response):
    clear_auth_cookies(response)


@router.get("/oauth/{provider}/authorize")
async def oauth_authorize(provider: str, response: Response, role: Role = Query(Role.candidate)):
    try:
        provider_config(provider)
    except ValueError as exc:
        raise HTTPException(404, str(exc))
    except RuntimeError as exc:
        raise HTTPException(503, str(exc))
    nonce = secrets.token_urlsafe(32)
    signed_state = create_oauth_state({"nonce": nonce, "provider": provider, "role": role.value, "intent": "login"})
    redirect = RedirectResponse(authorization_url(provider, nonce), status_code=302)
    redirect.set_cookie("oauth_state", signed_state, max_age=600, httponly=True, secure=settings.secure_cookies, samesite="lax", path=f"{settings.api_prefix}/auth/oauth/{provider}/callback")
    return redirect


@router.get("/oauth/{provider}/link")
async def oauth_link(provider: str, user: User = Depends(current_user)):
    try:
        provider_config(provider)
    except ValueError as exc:
        raise HTTPException(404, str(exc))
    except RuntimeError as exc:
        raise HTTPException(503, str(exc))
    nonce = secrets.token_urlsafe(32)
    signed_state = create_oauth_state({"nonce": nonce, "provider": provider, "user_id": user.id, "intent": "link"})
    redirect = RedirectResponse(authorization_url(provider, nonce), status_code=302)
    redirect.set_cookie("oauth_state", signed_state, max_age=600, httponly=True, secure=settings.secure_cookies, samesite="lax", path=f"{settings.api_prefix}/auth/oauth/{provider}/callback")
    return redirect


@router.get("/oauth/{provider}/callback")
async def oauth_callback(provider: str, code: str | None = None, state: str | None = None, error: str | None = None, oauth_state: str | None = Cookie(None), db: AsyncSession = Depends(get_db)):
    frontend_callback = f"{settings.frontend_url}/oauth/callback"
    if error:
        return RedirectResponse(f"{frontend_callback}?{urlencode({'error': error})}")
    if not code or not state or not oauth_state:
        return RedirectResponse(f"{frontend_callback}?error=invalid_oauth_response")
    try:
        state_data = decode_oauth_state(oauth_state)
        if not secrets.compare_digest(state_data.get("nonce", ""), state) or state_data.get("provider") != provider:
            raise ValueError("OAuth state mismatch")
        profile = await exchange_code(provider, code)
        provider_field = f"{provider}_id"
        provider_id = str(profile["sub"])
        email = str(profile["email"]).lower()
        existing_provider = await db.scalar(select(User).where(getattr(User, provider_field) == provider_id))
        intent = state_data.get("intent")
        if intent == "link":
            user = await db.get(User, state_data.get("user_id"))
            if not user:
                raise ValueError("The linking session has expired")
            if existing_provider and existing_provider.id != user.id:
                raise ValueError(f"That {provider.title()} account is already linked")
            email_owner = await db.scalar(select(User).where(User.email == email))
            if email_owner and email_owner.id != user.id:
                raise ValueError("That provider email belongs to another SkillSync account")
        else:
            user = existing_provider or await db.scalar(select(User).where(User.email == email))
            if not user:
                role = Role(state_data.get("role", Role.candidate.value))
                user = User(email=email, full_name=profile.get("name") or email.split("@")[0], password_hash=f"!oauth:{secrets.token_urlsafe(40)}", role=role, auth_provider=provider)
                db.add(user)
        setattr(user, provider_field, provider_id)
        user.profile_picture = profile.get("picture") or user.profile_picture
        user.email_verified = bool(profile.get("email_verified", True))
        user.oauth_profile = {**(user.oauth_profile or {}), provider: {"name": profile.get("name"), "given_name": profile.get("given_name"), "family_name": profile.get("family_name"), "locale": profile.get("locale"), "picture": profile.get("picture"), "work_experience": profile.get("work_experience", []), "education": profile.get("education", []), "skills": profile.get("skills", [])}}
        if user.auth_provider == "email" and user.password_hash.startswith("!oauth:"):
            user.auth_provider = provider
        await db.commit(); await db.refresh(user)
        pair = tokens(user)
        redirect = RedirectResponse(f"{frontend_callback}?provider={provider}&linked={'1' if intent == 'link' else '0'}")
        set_auth_cookies(redirect, pair)
        redirect.delete_cookie("oauth_state", path=f"{settings.api_prefix}/auth/oauth/{provider}/callback")
        return redirect
    except (ValueError, RuntimeError) as exc:
        return RedirectResponse(f"{frontend_callback}?{urlencode({'error': str(exc)})}")


@router.delete("/oauth/{provider}/link", response_model=UserOut)
async def oauth_unlink(provider: str, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    if provider not in {"google", "linkedin"}:
        raise HTTPException(404, "Unsupported OAuth provider")
    field = f"{provider}_id"
    if not getattr(user, field):
        raise HTTPException(409, f"{provider.title()} is not linked")
    other = user.linkedin_id if provider == "google" else user.google_id
    if user.password_hash.startswith("!oauth:") and not other:
        raise HTTPException(409, "Add a password or link another provider before disconnecting your only login method")
    setattr(user, field, None)
    profile = dict(user.oauth_profile or {}); profile.pop(provider, None); user.oauth_profile = profile
    if user.auth_provider == provider:
        user.auth_provider = "email" if not user.password_hash.startswith("!oauth:") else ("linkedin" if user.linkedin_id else "google")
    await db.commit(); await db.refresh(user)
    return user
