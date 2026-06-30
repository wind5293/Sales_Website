"""
app/api/routes/users.py

GET    /api/users/me                   — Thông tin user
PATCH  /api/users/me                   — Cập nhật profile
POST   /api/users/change-password      — Đổi mật khẩu
POST   /api/users/addresses            — Thêm địa chỉ
GET    /api/users/addresses            — Danh sách địa chỉ
PATCH  /api/users/addresses/{id}       — Cập nhật địa chỉ
DELETE /api/users/addresses/{id}       — Xóa địa chỉ
POST   /api/users/addresses/from-order — Lưu địa chỉ từ đơn hàng
"""

import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from firebase_admin import auth
from google.cloud.firestore_v1 import SERVER_TIMESTAMP

from app.core.firebase import get_db
from app.core.security import get_uid, verify_token
from app.schemas import (
    AddressRequest,
    AddressUpdateRequest,
    ChangePasswordRequest,
    ProfileUpdateRequest,
)

router = APIRouter(prefix="/api/users", tags=["Users"])
db = get_db()

_USER_FIELDS = ["uid", "username", "email", "name", "dob", "gender", "place", "tel", "points", "rank"]


def _get_user_or_404(uid: str) -> dict:
    doc = db.collection("users").document(uid).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin user")
    return doc.to_dict()


def _serialize_user(data: dict, uid: str) -> dict:
    return {
        "uid": data.get("uid", uid),
        "username": data.get("username", ""),
        "email": data.get("email", ""),
        "name": data.get("name", ""),
        "dob": data.get("dob", ""),
        "gender": data.get("gender", ""),
        "place": data.get("place", ""),
        "tel": data.get("tel", ""),
        "points": data.get("points", 0),
        "rank": data.get("rank", "Silver"),
    }


def _clear_default_addresses(address_ref, exclude_id: str = None):
    for doc in address_ref.stream():
        if doc.id != exclude_id:
            doc.reference.update({"is_default": False})


# ─── Profile ──────────────────────────────────────────────────────────────────

@router.get("/me")
def get_me(decoded_token: dict = Depends(verify_token)):
    uid = get_uid(decoded_token)
    data = _get_user_or_404(uid)
    return _serialize_user(data, uid)


@router.patch("/me")
def update_profile(body: ProfileUpdateRequest, decoded_token: dict = Depends(verify_token)):
    uid = get_uid(decoded_token)
    _get_user_or_404(uid)

    updates = body.model_dump(exclude_unset=True)
    if updates:
        db.collection("users").document(uid).update(updates)

    data = db.collection("users").document(uid).get().to_dict()
    return {"message": "Cập nhật thông tin thành công", "user": _serialize_user(data, uid)}


@router.post("/change-password")
def change_password(body: ChangePasswordRequest, decoded_token: dict = Depends(verify_token)):
    uid = get_uid(decoded_token)
    user_data = _get_user_or_404(uid)
    email = user_data.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Không tìm thấy email của tài khoản")

    import os
    api_key = os.environ.get("FIREBASE_WEB_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Cấu hình Firebase API key bị thiếu")

    signin_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}"
    try:
        resp = httpx.post(
            signin_url,
            json={"email": email, "password": body.old_password, "returnSecureToken": True},
            timeout=10.0,
        )
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Không thể kết nối Firebase: {str(e)}")

    if resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Mật khẩu cũ không đúng")
    if body.old_password == body.new_password:
        raise HTTPException(status_code=400, detail="Mật khẩu mới phải khác mật khẩu cũ")

    auth.update_user(uid, password=body.new_password)
    return {"message": "Đổi mật khẩu thành công"}


# ─── Addresses ────────────────────────────────────────────────────────────────

@router.post("/addresses", status_code=status.HTTP_201_CREATED)
def add_address(body: AddressRequest, decoded_token: dict = Depends(verify_token)):
    uid = get_uid(decoded_token)
    address_ref = db.collection("users").document(uid).collection("addresses")

    if body.is_default:
        _clear_default_addresses(address_ref)

    address_id = str(uuid.uuid4())
    address_ref.document(address_id).set({
        "address_id": address_id,
        "name": body.name,
        "street": body.street,
        "city": body.city,
        "district": body.district,
        "zip_code": body.zip_code,
        "phone": body.phone,
        "is_default": body.is_default,
        "created_at": SERVER_TIMESTAMP,
    })
    return {"address_id": address_id, "message": "Thêm địa chỉ thành công"}


@router.get("/addresses")
def list_addresses(decoded_token: dict = Depends(verify_token)):
    uid = get_uid(decoded_token)
    docs = db.collection("users").document(uid).collection("addresses").stream()
    addresses = [{k: v for k, v in doc.to_dict().items() if k != "created_at"} for doc in docs]
    addresses.sort(key=lambda x: not x.get("is_default", False))
    return {"addresses": addresses}


@router.patch("/addresses/{address_id}")
def update_address(
    address_id: str,
    body: AddressUpdateRequest,
    decoded_token: dict = Depends(verify_token),
):
    uid = get_uid(decoded_token)
    address_ref = db.collection("users").document(uid).collection("addresses")
    doc = address_ref.document(address_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Không tìm thấy địa chỉ")

    updates = body.model_dump(exclude_unset=True)
    if updates.get("is_default"):
        _clear_default_addresses(address_ref, exclude_id=address_id)

    if updates:
        address_ref.document(address_id).update(updates)

    updated = {k: v for k, v in address_ref.document(address_id).get().to_dict().items() if k != "created_at"}
    return {"message": "Cập nhật địa chỉ thành công", "address": updated}


@router.delete("/addresses/{address_id}")
def delete_address(address_id: str, decoded_token: dict = Depends(verify_token)):
    uid = get_uid(decoded_token)
    ref = db.collection("users").document(uid).collection("addresses").document(address_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Không tìm thấy địa chỉ")
    ref.delete()
    return {"message": "Xóa địa chỉ thành công"}


@router.post("/addresses/from-order", status_code=status.HTTP_201_CREATED)
def save_address_from_order(body: AddressRequest, decoded_token: dict = Depends(verify_token)):
    uid = get_uid(decoded_token)
    address_ref = db.collection("users").document(uid).collection("addresses")

    existing = list(
        address_ref
        .where("street", "==", body.street)
        .where("district", "==", body.district)
        .where("city", "==", body.city)
        .limit(1)
        .stream()
    )
    if existing:
        return {"message": "Địa chỉ đã tồn tại", "saved": False}

    address_id = str(uuid.uuid4())
    address_ref.document(address_id).set({
        "name": body.name,
        "address_id": address_id,
        "street": body.street,
        "city": body.city,
        "district": body.district or "",
        "zip_code": body.zip_code or "",
        "phone": body.phone or "",
        "is_default": False,
        "created_at": SERVER_TIMESTAMP,
    })
    return {"address_id": address_id, "message": "Đã lưu địa chỉ mới", "saved": True}
