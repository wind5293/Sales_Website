from fastapi import APIRouter, HTTPException, status, Header
from firebase_admin import auth
from app.models.schemas import LoginRequest, SignupRequest
from app.services.firebase import get_db

router = APIRouter(prefix="/api/auth", tags=["Auth"])
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


@router.post("/login", status_code=status.HTTP_200_OK)
def login(body: LoginRequest):
    """
    Đăng nhập: xác minh email tồn tại trên Firebase Auth.
    Việc kiểm tra password thực sự do Firebase Client SDK xử lý ở frontend,
    backend chỉ trả về thông tin user từ Firestore.
    """
    try:
        user_record = auth.get_user_by_email(body.email)

        # Lấy thêm thông tin từ Firestore
        user_doc = db.collection("users").document(user_record.uid).get()
        user_data = user_doc.to_dict() if user_doc.exists else {}

        return {
            "message": "Đăng nhập thành công",
            "user": {
                "uid": user_record.uid,
                "email": user_record.email,
                "username": user_data.get("username", user_record.display_name or ""),
                "rank": user_data.get("rank", "Silver"),
                "points": user_data.get("points", 0),
            }
        }

    except auth.UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email này chưa được đăng ký"
        )
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


@router.get("/me")
def get_me(authorization: str = Header(...)):
    """Lấy thông tin user hiện tại từ token"""
    decoded = verify_token(authorization)
    uid = decoded["uid"]

    user_doc = db.collection("users").document(uid).get()
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin user")

    return user_doc.to_dict()