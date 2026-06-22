from fastapi import APIRouter, Depends, HTTPException, Header, status
from firebase_admin import auth
from app.services.firebase import get_db
from app.models.schemas import ProfileUpdateRequest

router = APIRouter(prefix="/api/users", tags=["Users"])
db = get_db()


def verify_token(authorization: str = Header(...)) -> dict:
    """Xác thực Firebase ID Token từ header Authorization: Bearer <token>"""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token không hợp lệ")
    token = authorization.split(" ")[1]
    try:
        return auth.verify_id_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Token hết hạn hoặc không hợp lệ")


@router.patch("/profile")
def update_profile(
    data: ProfileUpdateRequest,
    decoded_token: dict = Depends(verify_token)
):
    """Cập nhật thông tin profile người dùng"""
    uid = decoded_token.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Token không hợp lệ")

    try:
        # Lấy user hiện tại
        user_doc = db.collection("users").document(uid).get()
        if not user_doc.exists:
            raise HTTPException(status_code=404, detail="Không tìm thấy thông tin user")

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
