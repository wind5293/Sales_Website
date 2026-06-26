"""
app/schemas/__init__.py

Single source of truth cho tất cả Pydantic models.
Import từ đây thay vì từ nhiều schemas.py khác nhau.
"""

import re
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


# ─── Helpers ──────────────────────────────────────────────────────────────────

def slugify(text: str) -> str:
    """Chuyển tên sản phẩm thành slug URL-friendly, hỗ trợ tiếng Việt."""
    text = text.lower().strip()
    vi_map = str.maketrans(
        "àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ"
        "ÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴĐ",
        "aaaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiioooooooooooooooooouuuuuuuuuuuyyyyyd"
        "aaaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiioooooooooooooooooouuuuuuuuuuuyyyyyd",
    )
    text = text.translate(vi_map)
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"\s+", "-", text)
    return text.strip("-")


# ─── Auth ─────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class SignupRequest(BaseModel):
    username: str
    password: str
    email: str
    tel: str


# ─── Admin Auth ───────────────────────────────────────────────────────────────

class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)


class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 12 * 3600
    admin_info: dict


# ─── Products ─────────────────────────────────────────────────────────────────

class SpecItem(BaseModel):
    """Một dòng thông số kỹ thuật: { name: "RAM", value: "8GB" }"""
    name: str
    value: str


class CreateProductRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=300)
    description: Optional[str] = ""
    shortDescription: Optional[str] = ""
    price: int = Field(..., gt=0)
    originalPrice: Optional[int] = Field(None, gt=0)
    discountPercent: Optional[int] = Field(None, ge=0, le=100)
    stockQuantity: int = Field(..., ge=0)
    brand: Optional[str] = ""
    categoryId: str = Field(..., min_length=1)
    categoryName: Optional[str] = ""
    categorySlug: Optional[str] = ""
    sku: Optional[str] = ""
    slug: Optional[str] = ""
    thumbnailUrl: Optional[str] = ""
    images: Optional[List[str]] = []
    specs: Optional[List[SpecItem]] = []
    sourceUrl: Optional[str] = ""
    status: Optional[str] = "active"
    isFeatured: Optional[bool] = False

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v not in ("active", "inactive"):
            raise ValueError("status phải là 'active' hoặc 'inactive'")
        return v

    @model_validator(mode="after")
    def auto_fill(self):
        if not self.slug and self.name:
            self.slug = slugify(self.name)
        if not self.thumbnailUrl and self.images:
            self.thumbnailUrl = self.images[0]
        if self.discountPercent is None and self.originalPrice and self.originalPrice > self.price:
            self.discountPercent = round((1 - self.price / self.originalPrice) * 100)
        return self


class UpdateProductRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=300)
    description: Optional[str] = None
    shortDescription: Optional[str] = None
    price: Optional[int] = Field(None, gt=0)
    originalPrice: Optional[int] = Field(None, gt=0)
    discountPercent: Optional[int] = Field(None, ge=0, le=100)
    stockQuantity: Optional[int] = Field(None, ge=0)
    brand: Optional[str] = None
    categoryId: Optional[str] = None
    categoryName: Optional[str] = None
    categorySlug: Optional[str] = None
    sku: Optional[str] = None
    slug: Optional[str] = None
    thumbnailUrl: Optional[str] = None
    images: Optional[List[str]] = None
    specs: Optional[List[SpecItem]] = None
    sourceUrl: Optional[str] = None
    status: Optional[str] = None
    isFeatured: Optional[bool] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v is not None and v not in ("active", "inactive", "out_of_stock", "hidden"):
            raise ValueError("status không hợp lệ")
        return v


# ─── Cart ─────────────────────────────────────────────────────────────────────

class AddToCartRequest(BaseModel):
    productId: str
    quantity: int = 1


class UpdateCartItemRequest(BaseModel):
    quantity: int = Field(..., ge=1)


class RemoveFromCartRequest(BaseModel):
    cartItemId: str


# ─── Orders ───────────────────────────────────────────────────────────────────

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


# ─── Users ────────────────────────────────────────────────────────────────────

class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    place: Optional[str] = None
    tel: Optional[str] = None


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


# ─── Reviews ──────────────────────────────────────────────────────────────────

class CreateReviewRequest(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    title: Optional[str] = Field(None, max_length=200)
    text: str = Field(..., min_length=1, max_length=2000)


class UpdateReviewRequest(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5)
    title: Optional[str] = Field(None, max_length=200)
    text: Optional[str] = Field(None, min_length=1, max_length=2000)
