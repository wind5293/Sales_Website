import uuid

from fastapi import APIRouter, Depends, HTTPException, Header, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth
from app.services.firebase import get_db
from app.models.schemas import AddressRequest, AddressUpdateRequest, ChangePasswordRequest, ProfileUpdateRequest
from google.cloud.firestore_v1 import SERVER_TIMESTAMP

router = APIRouter(prefix="/api/users", tags=["Users"])
db = get_db()

bearer_scheme = HTTPBearer()


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> dict:
    token = credentials.credentials  # tự động bỏ prefix "Bearer "
    try:
        return auth.verify_id_token(token)
    except Exception as e:
        print(f"[AUTH ERROR] {type(e).__name__}: {e}")
        raise HTTPException(status_code=401, detail="Token hết hạn hoặc không hợp lệ")
 
 
def get_uid(decoded_token: dict) -> str:
    uid = decoded_token.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Token không hợp lệ")
    return uid
 
 
def get_user_doc_or_404(uid: str) -> dict:
    doc = db.collection("users").document(uid).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin user")
    return doc.to_dict()


@router.get("/me")
def get_me(decoded_token: dict = Depends(verify_token)):
    """Lấy thông tin user hiện tại từ token"""
    uid = decoded_token.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Token không hợp lệ")

    try:
        user_doc = db.collection("users").document(uid).get()
        if not user_doc.exists:
            raise HTTPException(status_code=404, detail="Không tìm thấy thông tin user")

        user_data = user_doc.to_dict()
        
        # Đảm bảo trả về toàn bộ field cần thiết cho frontend
        return {
            "uid": user_data.get("uid", uid),
            "username": user_data.get("username", ""),
            "email": user_data.get("email", ""),
            "name": user_data.get("name", ""),
            "dob": user_data.get("dob", ""),
            "gender": user_data.get("gender", ""),
            "place": user_data.get("place", ""),
            "tel": user_data.get("tel", ""),
            "points": user_data.get("points", 0),
            "rank": user_data.get("rank", "Silver")
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi lấy thông tin user: {str(e)}"
        )

@router.patch("/me")
def update_profile(
    data: ProfileUpdateRequest,
    decoded_token: dict = Depends(verify_token)
):
    """Cập nhật thông tin profile người dùng"""
    uid = get_uid(decoded_token)

    try:
        # Lấy user hiện tại
        get_user_doc_or_404(uid)

        # Cập nhật các field được phép
        update_data = {}
        if data.name is not None:
            update_data["name"] = data.name
        if data.dob is not None:
            update_data["dob"] = data.dob
        if data.gender is not None:
            update_data["gender"] = data.gender
        if data.place is not None:
            update_data["place"] = data.place
        if data.tel is not None:
            update_data["tel"] = data.tel

        if update_data:
            db.collection("users").document(uid).update(update_data)

        # Trả về thông tin user đã cập nhật
        user_doc = db.collection("users").document(uid).get()
        user_data = user_doc.to_dict()

        return {
            "message": "Cập nhật thông tin thành công",
            "user": {
                "uid": user_data.get("uid", uid),
                "username": user_data.get("username", ""),
                "email": user_data.get("email", ""),
                "name": user_data.get("name", ""),
                "dob": user_data.get("dob", ""),
                "gender": user_data.get("gender", ""),
                "place": user_data.get("place", ""),
                "tel": user_data.get("tel", ""),
                "points": user_data.get("points", 0),
                "rank": user_data.get("rank", "Silver")
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi cập nhật profile: {str(e)}"
        )
        

@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    decoded_token: dict = Depends(verify_token)
):
    """Đổi mật khẩu người dùng"""
    uid = get_uid(decoded_token)
 
    try:
        # Lấy email từ Firestore để xác thực mật khẩu cũ qua Firebase REST API
        user_data = get_user_doc_or_404(uid)
        email = user_data.get("email")
        if not email:
            raise HTTPException(status_code=400, detail="Không tìm thấy email của tài khoản")
 
        # Xác thực old_password qua Firebase Auth REST API
        import httpx, os
        api_key = os.environ.get("FIREBASE_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Cấu hình Firebase API key bị thiếu"
            )
 
        signin_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}"
        resp = httpx.post(signin_url, json={
            "email": email,
            "password": data.old_password,
            "returnSecureToken": False
        })
 
        if resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Mật khẩu cũ không đúng")
 
        # Đặt mật khẩu mới
        auth.update_user(uid, password=data.new_password)
 
        return {"message": "Đổi mật khẩu thành công"}
 
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi đổi mật khẩu: {str(e)}"
        )


@router.post("/addresses", status_code=status.HTTP_201_CREATED)
def add_address(
    data: AddressRequest,
    decoded_token: dict = Depends(verify_token)
):
    """Thêm địa chỉ mới"""
    uid = get_uid(decoded_token)
 
    try:
        address_id = str(uuid.uuid4())
        address_ref = db.collection("users").document(uid).collection("addresses")
 
        # Nếu là địa chỉ mặc định, bỏ mặc định của các địa chỉ khác
        if data.is_default:
            _clear_default_addresses(address_ref)
 
        address_ref.document(address_id).set({
            "address_id": address_id,
            "street": data.street,
            "city": data.city,
            "district": data.district,
            "zip_code": data.zip_code,
            "phone": data.phone,
            "is_default": data.is_default,
            "created_at": SERVER_TIMESTAMP,
        })
 
        return {"address_id": address_id, "message": "Thêm địa chỉ thành công"}
 
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi thêm địa chỉ: {str(e)}"
        )
        

@router.get("/addresses")
def list_addresses(decoded_token: dict = Depends(verify_token)):
    """Lấy danh sách địa chỉ của user"""
    uid = get_uid(decoded_token)
 
    try:
        docs = db.collection("users").document(uid).collection("addresses").stream()
        addresses = []
        for doc in docs:
            d = doc.to_dict()
            d.pop("created_at", None)   # loại bỏ Firestore timestamp trước khi serialize
            addresses.append(d)
 
        # Địa chỉ mặc định lên đầu
        addresses.sort(key=lambda x: (not x.get("is_default", False),))
 
        return {"addresses": addresses}
 
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi lấy danh sách địa chỉ: {str(e)}"
        )


@router.patch("/addresses/{address_id}")
def update_address(
    address_id: str,
    data: AddressUpdateRequest,
    decoded_token: dict = Depends(verify_token)
):
    """Cập nhật thông tin địa chỉ"""
    uid = get_uid(decoded_token)
 
    try:
        address_ref = db.collection("users").document(uid).collection("addresses")
        address_doc = address_ref.document(address_id).get()
 
        if not address_doc.exists:
            raise HTTPException(status_code=404, detail="Không tìm thấy địa chỉ")
 
        update_data = {}
        if data.street is not None:
            update_data["street"] = data.street
        if data.city is not None:
            update_data["city"] = data.city
        if data.district is not None:
            update_data["district"] = data.district
        if data.zip_code is not None:
            update_data["zip_code"] = data.zip_code
        if data.phone is not None:
            update_data["phone"] = data.phone
        if data.is_default is not None:
            update_data["is_default"] = data.is_default
            if data.is_default:
                _clear_default_addresses(address_ref, exclude_id=address_id)
 
        if update_data:
            address_ref.document(address_id).update(update_data)
 
        updated = address_ref.document(address_id).get().to_dict()
        updated.pop("created_at", None)
 
        return {"message": "Cập nhật địa chỉ thành công", "address": updated}
 
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi cập nhật địa chỉ: {str(e)}"
        )
        
        
@router.delete("/addresses/{address_id}")
def delete_address(
    address_id: str,
    decoded_token: dict = Depends(verify_token)
):
    """Xóa địa chỉ"""
    uid = get_uid(decoded_token)
 
    try:
        address_ref = db.collection("users").document(uid).collection("addresses").document(address_id)
        if not address_ref.get().exists:
            raise HTTPException(status_code=404, detail="Không tìm thấy địa chỉ")
 
        address_ref.delete()
        return {"message": "Xóa địa chỉ thành công"}
 
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi xóa địa chỉ: {str(e)}"
        )

def _clear_default_addresses(address_ref, exclude_id: str = None):
    """Bỏ is_default của tất cả địa chỉ (trừ exclude_id nếu có)"""
    for doc in address_ref.stream():
        if doc.id != exclude_id:
            doc.reference.update({"is_default": False})