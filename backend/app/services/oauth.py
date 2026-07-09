from dataclasses import dataclass
from urllib.parse import urlencode
import httpx
from app.core.config import settings


@dataclass(frozen=True)
class OAuthProvider:
    authorize_url: str
    token_url: str
    userinfo_url: str
    client_id: str | None
    client_secret: str | None
    redirect_uri: str
    scopes: tuple[str, ...]


def providers() -> dict[str, OAuthProvider]:
    return {
        "google": OAuthProvider(
            "https://accounts.google.com/o/oauth2/v2/auth",
            "https://oauth2.googleapis.com/token",
            "https://openidconnect.googleapis.com/v1/userinfo",
            settings.google_client_id,
            settings.google_client_secret,
            settings.google_redirect_uri,
            ("openid", "email", "profile"),
        ),
        "linkedin": OAuthProvider(
            "https://www.linkedin.com/oauth/v2/authorization",
            "https://www.linkedin.com/oauth/v2/accessToken",
            "https://api.linkedin.com/v2/userinfo",
            settings.linkedin_client_id,
            settings.linkedin_client_secret,
            settings.linkedin_redirect_uri,
            tuple(["openid", "profile", "email", *settings.linkedin_extra_scopes.split()]),
        ),
    }


def provider_config(name: str) -> OAuthProvider:
    provider = providers().get(name)
    if not provider:
        raise ValueError("Unsupported OAuth provider")
    if not provider.client_id or not provider.client_secret:
        raise RuntimeError(f"{name.title()} authentication is not configured")
    return provider


def authorization_url(name: str, state: str) -> str:
    provider = provider_config(name)
    params = {
        "client_id": provider.client_id,
        "redirect_uri": provider.redirect_uri,
        "response_type": "code",
        "scope": " ".join(provider.scopes),
        "state": state,
    }
    if name == "google":
        params.update({"access_type": "offline", "include_granted_scopes": "true", "prompt": "select_account"})
    return f"{provider.authorize_url}?{urlencode(params)}"


async def exchange_code(name: str, code: str) -> dict:
    provider = provider_config(name)
    payload = {
        "grant_type": "authorization_code",
        "code": code,
        "client_id": provider.client_id,
        "client_secret": provider.client_secret,
        "redirect_uri": provider.redirect_uri,
    }
    async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
        token_response = await client.post(provider.token_url, data=payload, headers={"Accept": "application/json"})
        if token_response.status_code != 200:
            raise ValueError("The provider rejected the authorization code")
        token_data = token_response.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise ValueError("The provider did not return an access token")
        profile_response = await client.get(provider.userinfo_url, headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"})
        if profile_response.status_code != 200:
            raise ValueError("The provider profile could not be validated")
        profile = profile_response.json()
    if not profile.get("sub") or not profile.get("email"):
        raise ValueError("The provider did not return a stable ID and email")
    return profile
