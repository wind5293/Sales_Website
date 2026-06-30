"""
app/core/security.py

Single source of truth cho toàn bộ xác thực:
  - verify_token      → Firebase ID Token (dùng cho user routes)
  - verify_admin_token → JWT tự tạo (dùng cho admin routes)
  - require_permission → kiểm tra quyền admin cụ thể
"""

from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth
from jose import JWTError, jwt

from app.core.config import ACCESS_TOKEN_EXPIRE_HOURS, ALGORITHM, SECRET_KEY
from app.core.firebase import get_db

_bearer = HTTPBearer()
db = get_db()

# ── Firebase user token ───────────────────────────────────────────────────────

def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    """Xác thực Firebase ID Token. Dùng cho tất cả user routes."""
    try:
        decoded_token = auth.verify_id_token(credentials.credentials)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token hết hạn hoặc không hợp lệ",
        )
        
    uid = decoded_token.get("uid")
    if uid:
        user_doc = db.collection("users").document(uid).get()
        if user_doc.exists and user_doc.to_dict().get("is_banned"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tài khoản của bạn đã bị khóa",
            )

    return decoded_token


def get_uid(decoded_token: dict) -> str:
    """Lấy uid từ decoded token, raise 401 nếu không có."""
    uid = decoded_token.get("uid")
    if not uid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token không hợp lệ")
    return uid


# ── Admin JWT ─────────────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload["iat"] = datetime.utcnow()
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_admin_token(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    """Xác thực admin JWT. Dùng cho tất cả admin routes."""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        if not payload.get("sub"):
            raise ValueError("Missing sub")
        return payload
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ hoặc đã hết hạn",
            headers={"WWW-Authenticate": "Bearer"},
        )


def require_permission(permission: str):
    """
    Dependency kiểm tra quyền admin cụ thể.

    Usage:
        @router.delete("/users/{id}")
        def delete_user(admin = Depends(require_permission("delete_users"))):
            ...
    """
    def _check(admin: dict = Depends(verify_admin_token)):
        if admin.get("role") != "superadmin" and permission not in admin.get("permissions", []):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Bạn không có quyền: {permission}",
            )
        return admin
    return _check
