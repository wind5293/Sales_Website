"""
app/routers/admin_auth.py

Thiết kế:
  - Admin lưu trong Firestore collection "admins" với các field:
      email (string), password_hash (string), role (string), 
      permissions (list), createdAt (timestamp), isActive (bool)
  - Login → trả về JWT (python-jose)
  - Password hash bằng bcrypt (passlib)
  - Dependency verify_admin_token dùng chung cho toàn bộ admin routes

Cài thêm nếu chưa có:
  pip install python-jose[cryptography] passlib[bcrypt]
"""

from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
from app.models.schemas import ACCESS_TOKEN_EXPIRE_HOURS, ALGORITHM, SECRET_KEY, AdminLoginRequest, AdminLoginResponse
import os

from app.services.firebase import get_db

router = APIRouter(prefix="/api/admin", tags=["Admin Auth"])
db = get_db()

# ─── Config ──────────────────────────────────────────────────────────────────

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer()

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def _verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def _create_access_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload["iat"] = datetime.utcnow()
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _get_admin_by_email(email: str) -> Optional[dict]:
    """Tìm admin theo email trong Firestore."""
    docs = (
        db.collection("admins")
        .where("email", "==", email)
        .where("isActive", "==", True)
        .limit(1)
        .stream()
    )
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        return data
    return None


# ─── Dependency dùng chung cho mọi admin route ───────────────────────────────

def verify_admin_token(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """
    FastAPI Dependency — đặt vào bất kỳ admin endpoint nào:

        @router.get("/admin/something")
        def something(admin = Depends(verify_admin_token)):
            ...

    Trả về dict chứa thông tin admin từ JWT payload.
    Raise 401 nếu token không hợp lệ hoặc hết hạn.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token không hợp lệ hoặc đã hết hạn",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        admin_id: str = payload.get("sub")
        if not admin_id:
            raise credentials_exception
        return payload
    except JWTError:
        raise credentials_exception


def require_permission(permission: str):
    """
    Dependency kiểm tra quyền cụ thể, dùng lồng với verify_admin_token:

        @router.delete("/admin/users/{id}")
        def delete_user(admin = Depends(require_permission("delete_users"))):
            ...
    """
    def _check(admin: dict = Depends(verify_admin_token)):
        perms = admin.get("permissions", [])
        if admin.get("role") != "superadmin" and permission not in perms:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Bạn không có quyền: {permission}",
            )
        return admin
    return _check


# ─── POST /api/admin/login ────────────────────────────────────────────────────

@router.post(
    "/login",
    response_model=AdminLoginResponse,
    summary="Đăng nhập admin",
)
def admin_login(body: AdminLoginRequest):
    """
    Xác thực email + password, trả về JWT nếu hợp lệ.
    Token có hiệu lực 12 giờ.
    """
    admin = _get_admin_by_email(body.email)

    # Dùng thông báo chung để tránh lộ thông tin email có tồn tại hay không
    if not admin or not _verify_password(body.password, admin.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không đúng",
        )

    token = _create_access_token({
        "sub": admin["id"],
        "email": admin["email"],
        "role": admin.get("role", "admin"),
        "permissions": admin.get("permissions", []),
    })

    # Cập nhật lastLoginAt
    db.collection("admins").document(admin["id"]).update({
        "lastLoginAt": datetime.now()
    })

    return AdminLoginResponse(
        access_token=token,
        admin_info={
            "id": admin["id"],
            "email": admin["email"],
            "role": admin.get("role", "admin"),
            "permissions": admin.get("permissions", []),
        },
    )


# ─── GET /api/admin/me ────────────────────────────────────────────────────────

@router.get(
    "/me",
    summary="Lấy thông tin admin hiện tại",
)
def get_admin_me(admin: dict = Depends(verify_admin_token)):
    """
    Xác thực token và trả về thông tin admin từ Firestore (luôn fresh).
    """
    doc = db.collection("admins").document(admin["sub"]).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Không tìm thấy admin")

    data = doc.to_dict()
    return {
        "id": doc.id,
        "email": data.get("email"),
        "role": data.get("role"),
        "permissions": data.get("permissions", []),
        "createdAt": data.get("createdAt").isoformat() if data.get("createdAt") else None,
        "lastLoginAt": data.get("lastLoginAt").isoformat() if data.get("lastLoginAt") else None,
    }


# ─── Utility: tạo admin đầu tiên (chỉ dùng khi setup, xóa sau khi dùng) ──────

@router.post(
    "/setup",
    status_code=status.HTTP_201_CREATED,
    summary="Tạo tài khoản admin đầu tiên (xóa route này sau khi dùng)",
    include_in_schema=False,  # Ẩn khỏi Swagger docs
)
def setup_first_admin(body: AdminLoginRequest):
    """
    Chỉ dùng 1 lần để seed admin đầu tiên vào Firestore.
    Sau khi tạo xong → XÓA hoặc comment route này lại.
    """
    # Kiểm tra đã có admin chưa
    existing = list(db.collection("admins").limit(1).stream())
    if existing:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Đã có admin trong hệ thống. Không thể dùng route này nữa.",
        )

    doc_ref = db.collection("admins").add({
        "email": body.email,
        "password_hash": _hash_password(body.password),
        "role": "superadmin",
        "permissions": [
            "manage_products",
            "manage_orders",
            "manage_users",
            "view_analytics",
            "delete_users",
        ],
        "isActive": True,
        "createdAt": datetime.now(),
        "lastLoginAt": None,
    })

    return {
        "message": "Tạo superadmin thành công. Hãy xóa route /setup ngay bây giờ.",
        "admin_id": doc_ref[1].id,
    }