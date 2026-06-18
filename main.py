from fastapi import FastAPI, Response, status, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import firebase_admin
from firebase_admin import credentials, firestore, auth

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"], # Cho phép tất cả các hàm GET, POST, PATCH, DELETE...
    allow_headers=["*"], # Cho phép tất cả các loại Header gửi lên
)

cred = credentials.Certificate("firebase-key.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# Giả lập Database trong bộ nhớ
users = [
    {
        "id" : 1,
        "username": "katimerie",
        "password": "20022007",
        "name" : "Katy",
        "email": "katimerie@gmail.com",
        "place": "Vietnam",
        "tel": "0987654321",
        "rank" : "Diamond",
        "point" : 1500
    },
    {
        "id" : 2,
        "username": "wind5293",
        "password": "soulofwind01",
        "name" : "Wind",
        "email": "mywind5293@gmail.com",
        "place": "Vietnam",
        "tel": "0981696125",
        "rank" : "Bronze",
        "point" : 15
    }
]

items = [
    {
        "name": "Laptop",
        "rating": 4.9,
        "item_sold": 166,
        "price": "20000000"
    }
]

orders = []

class Users(BaseModel):
    username: str 
    password: str
    name: str = None
    dob: str = None
    email: str = None
    place: str = None
    tel: str = None
    rank: str = None
    point: str = None

class EditUserInfo(BaseModel):
    name: str = None
    dob: str = None
    email: str = None
    place: str = None
    tel: str = None
    rank: str = None
    point: str = None
    
class CreateItems(BaseModel):
    name: str
    rating: float
    item_sold: int
    price: str

class OrderCreate(BaseModel):
    user_id: int
    item_name: str
    original_price: float
    
class LoginRequest(BaseModel):
    email: str
    password: str
    
class SignupRequest(BaseModel):
    username: str
    password: str
    email: str
    tel: str

# 1. GET - Lấy toàn bộ danh sách
@app.get("/api/users")
def get_all_users():
    return users

@app.get("/api/orders")
def get_all_orders():
    return orders

@app.get("/api/items")
def get_all_items():
    return items

# 2. POST - Tạo mới một công việc
@app.post("/api/login", status_code=status.HTTP_201_CREATED)
def login(login_request: LoginRequest):
    try:
        user_record = auth.get_user_by_email(login_request.email)
        
        target_user = next((u for u in users if u["email"] == login_request.email), None)
        
        return {
            "message": "Đăng nhập thành công từ Firebase Auth!",
            "user": {
                "uid": user_record.uid,
                "email": user_record.email,
                "name": target_user["name"] if target_user else user_record.display_name,
                "rank": target_user["rank"] if target_user else "Silver",
                "point": target_user["point"] if target_user else 0
            }
        }
        
    except auth.UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Tài khoản email này không tồn tại trên hệ thống!"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    
@app.post("/api/signup", status_code=status.HTTP_201_CREATED)
def signup(signup_request: SignupRequest):
    if not signup_request.username or not signup_request.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Không được bỏ trống phần này!"
        )
        
    for user in users:
        if signup_request.username == user["username"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="Tên đăng nhập đã bị trùng!"
            )
            
    new_user = {
        "id": len(users) + 1,
        "username": signup_request.username,
        "password": signup_request.password,
        "name": None,
        "dob": None,
        "email": signup_request.email,
        "place": None,
        "tel": signup_request.tel,
        "rank": "Silver", 
        "point": 0    
    }
    
    users.append(new_user)
    return {
        "message": "Đăng ký tài khoản thành công!",
        "user": {
            "id": new_user["id"],
            "username": new_user["username"],
            "rank": new_user["rank"],
            "point": new_user["point"]
        }
    }

@app.post("/api/create_items", status_code=status.HTTP_201_CREATED)
def create_item(item: CreateItems):
    new_item = {   
        "name": item.name,
        "rating": item.rating,
        "item_sold": item.item_sold,
        "price": item.price
    }
    
    items.append(new_item)
    return {
        "message": "Tạo sản phẩm thành công",
        "items": new_item
    }

@app.post("/api/orders", status_code=status.HTTP_201_CREATED)
def create_order(order: OrderCreate):
    target_user = None
    
    for user in users:
        if user["id"] == order.user_id:
            target_user = user
            break
    
    if not target_user:
        raise HTTPException(status_code=404, detail="Thành viên không tồn tại!")
    
    discount = 0.0
    if target_user["rank"] == "Gold":
        discount = 0.05
    elif target_user["rank"] == "Diamond":
        discount = 0.1
        
    final_price = order.original_price * (1 - discount)
    earned_points = int(final_price / 100000)
    target_user["points"] += earned_points
    
    new_order = {
        "id": len(orders) + 1,
        "user_id": order.user_id,
        "item_name": order.item_name,
        "original_price": order.original_price,
        "final_price": final_price,
        "status": "Pending"
    }
    orders.append(new_order)
    return {
        "order": new_order,
        "user_updated": {
            "name": target_user["name"],
            "current_points": target_user["points"],
            "points_earned": earned_points
        }
    }

# 3. PATCH - Cập nhật một phần dữ liệu (Ví dụ: sửa tiêu đề hoặc đổi trạng thái hoàn thành)
@app.patch("/api/orders/{order_id}/cancel")
def cancel_order(order_id: int):
    target_order = None
    for order in orders:
        if order["id"] == order_id:
            target_order = order
           
    if not target_order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng này")
    
    target_user = next((u for u in users if u["id"] == target_order["user_id"]), None)
    points_to_deduct = int(target_order["final_price"] / 100000)
    if target_user:
        target_user["points"] -= points_to_deduct
        if target_user["points"] < 0:
            target_user["points"] = 0

    target_order["status"] = "Đã hủy"
            
    return {
        "message": "Hủy đơn hàng và hoàn điểm thành công!",
        "order": {
            "order_id": target_order["id"],
            "item_name": target_order["item_name"],
            "status": target_order["status"]
        },
        "user_updated": {
            "name": target_user["name"] if target_user else "N/A",
            "current_points": target_user["points"] if target_user else 0,
        }
    }
            