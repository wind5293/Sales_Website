import os
import httpx

from fastapi import APIRouter, Depends, HTTPException, status, Header
from firebase_admin import auth
from app.models.schemas import LoginRequest, SignupRequest
from app.services.firebase import get_db

router = APIRouter(prefix="/api/auth", tags=["Auth"])
db = get_db()

FIREBASE_WEB_API_KEY = os.environ["FIREBASE_WEB_API_KEY"]
FIREBASE_SIGN_IN_URL = (
    f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword"
    f"?key={FIREBASE_WEB_API_KEY}"
)

_GENERIC_LOGIN_ERROR = "Email hoặc mật khẩu không đúng"

def extract_token_from_header(authorization: str = Header(...)) -> str:
    """Extract Firebase ID Token từ Authorization header"""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token không hợp lệ")
    return authorization.split(" ")[1]

def verify_token(authorization: str = Header(...)) -> dict:
    """Xác thực Firebase ID Token từ header Authorization: Bearer <token>"""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token không hợp lệ")
    token = authorization.split(" ")[1]
    try:
        return auth.verify_id_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Token hết hạn hoặc không hợp lệ")

@router.post("/login", status_code=status.HTTP_200_OK)
def login(body: LoginRequest):
    """
    Đăng nhập: verify email + password thật sự qua Firebase Auth REST API
    (Admin SDK không có hàm verify password, nên phải gọi REST API).
    """
    try:
        resp = httpx.post(
            FIREBASE_SIGN_IN_URL,
            json={
                "email": body.email,
                "password": body.password,
                "returnSecureToken": True,
            },
            timeout=10,
        )
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Không thể kết nối tới dịch vụ xác thực, vui lòng thử lại"
        )
 
    if resp.status_code != 200:
        error_message = resp.json().get("error", {}).get("message", "")
        if error_message == "USER_DISABLED":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tài khoản đã bị khóa"
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=_GENERIC_LOGIN_ERROR
        )
 
    firebase_data = resp.json()
    uid = firebase_data["localId"]
 
    try:
        # Lấy thêm thông tin từ Firestore
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
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(body: SignupRequest):
    """Đăng ký tài khoản mới, lưu thông tin vào Firestore"""
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
            }
        }

    except auth.EmailAlreadyExistsError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email này đã được đăng ký"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
