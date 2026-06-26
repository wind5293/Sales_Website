"""
app/api/v1/routes/auth.py

POST /api/auth/login   — đăng nhập bằng email + password
POST /api/auth/signup  — đăng ký tài khoản mới
"""

import httpx
from fastapi import APIRouter, HTTPException, status
from firebase_admin import auth

from app.core.config import FIREBASE_SIGN_IN_URL
from app.core.firebase import get_db
from app.schemas import LoginRequest, SignupRequest

router = APIRouter(prefix="/api/auth", tags=["Auth"])
db = get_db()

_GENERIC_LOGIN_ERROR = "Email hoặc mật khẩu không đúng"


@router.post("/login", status_code=status.HTTP_200_OK)
def login(body: LoginRequest):
    """Đăng nhập qua Firebase Auth REST API và trả về idToken."""
    import os
    print("API KEY:", os.environ.get("FIREBASE_WEB_API_KEY", "MISSING"))
    print("SIGN IN URL:", FIREBASE_SIGN_IN_URL)
    
    try:
        resp = httpx.post(
            FIREBASE_SIGN_IN_URL,
            json={"email": body.email, "password": body.password, "returnSecureToken": True},
            timeout=10,
        )
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Không thể kết nối tới dịch vụ xác thực, vui lòng thử lại",
        )

    if resp.status_code != 200:
        err = resp.json().get("error", {}).get("message", "")
        if err == "USER_DISABLED":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tài khoản đã bị khóa")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=_GENERIC_LOGIN_ERROR)

    firebase_data = resp.json()
    uid = firebase_data["localId"]

    user_doc = db.collection("users").document(uid).get()
    user_data = user_doc.to_dict() if user_doc.exists else {}

    return {
        "message": "Đăng nhập thành công",
        "idToken": firebase_data["idToken"],
        "user": {
            "uid": uid,
            "email": firebase_data.get("email", body.email),
            "username": user_data.get("username", ""),
            "rank": user_data.get("rank", "Silver"),
            "points": user_data.get("points", 0),
        },
    }


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(body: SignupRequest):
    """Đăng ký tài khoản mới và lưu thông tin vào Firestore."""
    try:
        user_record = auth.create_user(
            email=body.email,
            password=body.password,
            display_name=body.username,
        )
        new_user = {
            "uid": user_record.uid,
            "username": body.username,
            "email": body.email,
            "tel": body.tel,
            "name": None,
            "dob": None,
            "place": None,
            "rank": "Silver",
            "points": 0,
        }
        db.collection("users").document(user_record.uid).set(new_user)

        return {
            "message": "Đăng ký thành công",
            "user": {
                "uid": user_record.uid,
                "username": new_user["username"],
                "email": new_user["email"],
                "rank": new_user["rank"],
                "points": new_user["points"],
            },
        }
    except auth.EmailAlreadyExistsError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email này đã được đăng ký")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
