"""Login: the CRM's session cookie, verified with the shared JWT secret.

The token only carries the user id, so the user's name, role and department are fetched from
the CRM's /auth/me over HTTP (cached briefly). This service never reads the CRM database.
Swapping in an own login later means replacing `current_user` only.
"""
import time
from dataclasses import dataclass

import httpx
import jwt
from fastapi import Depends, HTTPException, Request, status

from .config import Settings, get_settings


@dataclass
class User:
    id: str
    name: str
    email: str = ""
    role: str = ""
    department: str = ""

    @property
    def is_admin(self) -> bool:
        return self.role.lower() in ("admin", "super admin")


_cache: dict[str, tuple[float, User]] = {}
_CACHE_SECONDS = 300


def _token_from(request: Request, settings: Settings) -> str | None:
    token = request.cookies.get(settings.crm_session_cookie)
    if token:
        return token
    auth = request.headers.get("authorization", "")
    return auth[7:] if auth.lower().startswith("bearer ") else None


def _profile_from_crm(token: str, user_id: str, settings: Settings) -> User:
    hit = _cache.get(token)
    if hit and hit[0] > time.time():
        return hit[1]
    user = User(id=user_id, name=f"User {user_id}")
    if settings.crm_api_url:
        try:
            r = httpx.get(f"{settings.crm_api_url.rstrip('/')}/auth/me", cookies={settings.crm_session_cookie: token}, timeout=5)
            if r.status_code == 200:
                d = r.json()
                name = d.get("name") or f"{d.get('first_name') or ''} {d.get('last_name') or ''}".strip() or d.get("username") or user.name
                user = User(id=user_id, name=name, email=d.get("email") or "", role=d.get("role_name") or d.get("role") or "", department=d.get("department") or "")
            elif r.status_code in (401, 403):
                raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired. Please sign in again.")
        except httpx.HTTPError:
            pass  # CRM unreachable: the verified token is still enough to identify the user
    _cache[token] = (time.time() + _CACHE_SECONDS, user)
    return user


def _allowed(user: User, settings: Settings) -> bool:
    if not user.role and not user.department:
        return True  # profile unavailable: the signed token alone was accepted
    dept = user.department.lower()
    return user.role.lower() in settings.allowed_role_list or any(d in dept for d in settings.allowed_department_list)


def current_user(request: Request, settings: Settings = Depends(get_settings)) -> User:
    token = _token_from(request, settings)
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Please sign in.")
    if not settings.crm_jwt_secret:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "CRM_JWT_SECRET is not set on the SEO platform.")
    try:
        claims = jwt.decode(token, settings.crm_jwt_secret, algorithms=["HS256"])
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired. Please sign in again.") from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid session.") from exc
    user = _profile_from_crm(token, str(claims.get("sub", "")), settings)
    if not _allowed(user, settings):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "The SEO platform is for the Testing department and admins.")
    return user
