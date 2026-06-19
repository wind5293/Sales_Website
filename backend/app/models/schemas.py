from pydantic import BaseModel, EmailStr
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

class UpdateOrderStatusRequest(BaseModel):
    status: str  # pending | confirmed | shipped | delivered | cancelled