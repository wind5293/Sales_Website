"""
app/api/v1/routes/admin_auth.py

POST /api/admin/login  — đăng nhập admin, trả về JWT
GET  /api/admin/me     — thông tin admin hiện tại
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import ACCESS_TOKEN_EXPIRE_HOURS
from app.core.firebase import get_db
from app.core.security import create_access_token, verify_admin_token, verify_password
from app.schemas import AdminLoginRequest, AdminLoginResponse

router = APIRouter(prefix="/api/admin", tags=["Admin - Auth"])
db = get_db()


def _get_admin_by_email(email: str) -> dict | None:
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


@router.post("/login", response_model=AdminLoginResponse, summary="Đăng nhập admin")
def admin_login(body: AdminLoginRequest):
    admin = _get_admin_by_email(body.email)

    if not admin or not verify_password(body.password, admin.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không đúng",
        )

    token = create_access_token({
        "sub": admin["id"],
        "email": admin["email"],
        "role": admin.get("role", "admin"),
        "permissions": admin.get("permissions", []),
    })

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


@router.get("/me", summary="Thông tin admin hiện tại")
def get_admin_me(admin: dict = Depends(verify_admin_token)):
    doc = db.collection("admins").document(admin["sub"]).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Không tìm thấy admin")

    data = doc.to_dict()
    return {
        "id": doc.id,
        "email": data.get("email"),
        "role": data.get("role"),
        "permissions": data.get("permissions", []),
        "createdAt": data["createdAt"].isoformat() if data.get("createdAt") else None,
        "lastLoginAt": data["lastLoginAt"].isoformat() if data.get("lastLoginAt") else None,
    }
