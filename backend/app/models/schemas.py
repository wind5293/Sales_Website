from pydantic import BaseModel, Field
from typing import Optional

# ── Auth ──────────────────────────────────────────
class LoginRequest(BaseModel):
    email: str
    password: str

class SignupRequest(BaseModel):
    username: str
    password: str
    email: str
    tel: str

class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    place: Optional[str] = None
    tel: Optional[str] = None

# ── Products ──────────────────────────────────────
class CreateProductRequest(BaseModel):
    name: str
    brand: str
    categoryId: str
    categoryName: str
    description: Optional[str] = ""
    shortDescription: Optional[str] = ""
    price: float
    originalPrice: Optional[float] = None
    stockQuantity: int
    sku: str
    thumbnailUrl: Optional[str] = ""
    images: Optional[list[str]] = []
    specs: Optional[list[dict]] = []
    isFeatured: Optional[bool] = False

class UpdateProductRequest(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    originalPrice: Optional[float] = None
    stockQuantity: Optional[int] = None
    status: Optional[str] = None
    isFeatured: Optional[bool] = None
    description: Optional[str] = None

# ── Cart ──────────────────────────────────────────
class AddToCartRequest(BaseModel):
    productId: str
    quantity: int = 1

class RemoveFromCartRequest(BaseModel):
    productId: str

class UpdateCartItemRequest(BaseModel):
    productId: str
    quantity: int

# ── Orders ────────────────────────────────────────
class CreateOrderRequest(BaseModel):
    shippingAddress: str
    phone: str
    name: Optional[str] = ""
    note: Optional[str] = ""
    paymentMethod: Optional[str] = "cod"
    shippingMethod: Optional[str] = "fast"
    voucherCode: Optional[str] = None

class UpdateOrderStatusRequest(BaseModel):
    status: str  # pending | confirmed | shipped | delivered | cancelled
    
# ── Users ────────────────────────────────────────
class ProfileUpdateRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    dob: Optional[str] = None       # "YYYY-MM-DD"
    address: Optional[str] = None
    
class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str
 
 
class AddressRequest(BaseModel):
    name: str
    street: str
    city: str
    district: str
    zip_code: str
    phone: str
    is_default: bool = False
 
 
class AddressUpdateRequest(BaseModel):
    name: Optional[str] = None
    street: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    zip_code: Optional[str] = None
    phone: Optional[str] = None
    is_default: Optional[bool] = None
    
# ── Reviews ────────────────────────────────────────

class CreateReviewRequest(BaseModel):
    rating: int = Field(..., ge=1, le=5, description="Điểm đánh giá từ 1 đến 5")
    title: Optional[str] = Field(None, max_length=200, description="Tiêu đề đánh giá")
    text: str = Field(..., min_length=1, max_length=2000, description="Nội dung đánh giá")
    # user_id thực tế nên lấy từ JWT token; ở đây nhận tạm qua body để dễ test
    user_id: str = Field(..., description="ID người dùng (từ auth token)")
    user_name: Optional[str] = Field(None, description="Tên hiển thị người dùng")


class UpdateReviewRequest(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5)
    title: Optional[str] = Field(None, max_length=200)
    text: Optional[str] = Field(None, min_length=1, max_length=2000)
    # user_id dùng để xác thực quyền sở hữu review
    user_id: str = Field(..., description="ID người dùng (từ auth token)")
    
class UpdateReviewWithProduct(UpdateReviewRequest):
    product_id: str = Field(..., description="ID sản phẩm chứa review này")
