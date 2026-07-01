"""
app/api/routes/admin_products.py

GET    /api/admin/products               — Danh sách sản phẩm (phân trang + lọc)
POST   /api/admin/products               — Tạo sản phẩm mới
GET    /api/admin/products/{id}          — Chi tiết 1 sản phẩm
PATCH  /api/admin/products/{id}          — Cập nhật sản phẩm
DELETE /api/admin/products/{id}          — Xóa sản phẩm
POST   /api/admin/products/upload-image  — Upload ảnh lên storage
POST   /api/admin/products/{id}/images   — Thêm ảnh vào sản phẩm
"""

from datetime import datetime
from typing import Optional

import cloudinary
import cloudinary.uploader
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status

from app.core.firebase import get_db
from app.core.security import verify_admin_token
from app.schemas import CreateProductRequest, UpdateProductRequest, slugify
from app.core.config import CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME
from app.core.audit import log_admin_action


router = APIRouter(prefix="/api/admin", tags=["Admin - Products"])
db = get_db()

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE_BYTES = 5 * 1024 * 1024

cloudinary.config(
    cloud_name=CLOUDINARY_CLOUD_NAME, 
    api_key=CLOUDINARY_API_KEY,      
    api_secret=CLOUDINARY_API_SECRET, 
    secure=True,
)

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _serialize(doc) -> dict:
    d = doc.to_dict()
    d["id"] = doc.id

    # Serialize timestamps
    for field in ("createdAt", "updatedAt"):
        if d.get(field) and hasattr(d[field], "isoformat"):
            d[field] = d[field].isoformat()

    # images là list[str] trong Firestore — đảm bảo luôn là list
    if not isinstance(d.get("images"), list):
        d["images"] = []

    # thumbnailUrl: ưu tiên field riêng, fallback images[0]
    d["thumbnailUrl"] = d.get("thumbnailUrl") or (d["images"][0] if d["images"] else None)

    # Alias stockQuantity → stock để frontend dùng thống nhất
    d["stock"] = d.get("stockQuantity", 0)

    # Alias categoryName → category
    d["category"] = d.get("categoryName") or d.get("category")

    return d


def _get_or_404(product_id: str):
    ref = db.collection("products").document(product_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    return ref


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("/products", summary="Danh sách sản phẩm (phân trang + lọc)")
def list_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    # Search
    q: Optional[str] = Query(None, description="Tìm theo tên hoặc SKU (không phân biệt hoa thường)"),
    # Filters — Firestore-side (equality)
    categoryId: Optional[str] = Query(None),
    status: Optional[str] = Query(None, pattern="^(active|inactive|draft)$"),
    brand: Optional[str] = Query(None),
    # Filters — Python-side (range / computed)
    minPrice: Optional[int] = Query(None, ge=0),
    maxPrice: Optional[int] = Query(None, ge=0),
    lowStock: Optional[bool] = Query(None, description="Chỉ lấy hàng sắp hết (stockQuantity ≤ 5)"),
    admin: dict = Depends(verify_admin_token),
):
    query = db.collection("products").order_by("createdAt", direction="DESCENDING")

    # Firestore-side filters (equality — không cần composite index thêm nếu chỉ dùng 1 filter)
    if categoryId:
        query = query.where("categoryId", "==", categoryId)
    if status:
        query = query.where("status", "==", status)
    if brand:
        query = query.where("brand", "==", brand)

    has_python_filter = any([q, minPrice is not None, maxPrice is not None, lowStock])

    if not has_python_filter:
        total_docs = list(query.stream())
        total = len(total_docs)
        paginated = [_serialize(doc) for doc in query.offset(skip).limit(limit).stream()]
        return {
            "products": paginated,
            "total": total,
            "page": skip // limit,
            "pages": -(-total // limit),
        }

    # Có filter Python-side → load toàn bộ (không tránh được với Firestore)
    all_docs = [_serialize(doc) for doc in query.stream()]

    if q:
        q_lower = q.strip().lower()
        all_docs = [
            d for d in all_docs
            if q_lower in (d.get("name") or "").lower()
            or q_lower in (d.get("sku") or "").lower()
        ]
    if minPrice is not None:
        all_docs = [d for d in all_docs if (d.get("price") or 0) >= minPrice]
    if maxPrice is not None:
        all_docs = [d for d in all_docs if (d.get("price") or 0) <= maxPrice]
    if lowStock:
        all_docs = [d for d in all_docs if (d.get("stockQuantity") or 0) <= 5]

    total = len(all_docs)
    return {
        "products": all_docs[skip: skip + limit],
        "total": total,
        "page": skip // limit,
        "pages": -(-total // limit),
    }


@router.post("/products", status_code=status.HTTP_201_CREATED, summary="Tạo sản phẩm mới")
def create_product(
    body: CreateProductRequest,
    admin: dict = Depends(verify_admin_token),
):
    if body.sku:
        if list(db.collection("products").where("sku", "==", body.sku).limit(1).stream()):
            raise HTTPException(400, detail=f"SKU '{body.sku}' đã tồn tại")

    if body.slug:
        if list(db.collection("products").where("slug", "==", body.slug).limit(1).stream()):
            raise HTTPException(400, detail=f"Slug '{body.slug}' đã tồn tại")

    images: list[str] = body.images or []
    now = datetime.now()

    data = {
        **body.model_dump(exclude={"specs", "images"}),
        "images": images,
        "thumbnailUrl": body.thumbnailUrl or (images[0] if images else None),
        "specs": [s.model_dump() for s in (body.specs or [])],
        # stockQuantity là tên thật trong Firestore
        "stockQuantity": body.stockQuantity if hasattr(body, "stockQuantity") else 0,
        "rating": 0.0,
        "totalReviews": 0,
        "createdAt": now,
        "updatedAt": now,
    }
    _, ref = db.collection("products").add(data)
    
    log_admin_action(
        db, 
        admin, 
        action="create_product", 
        target_type="product", 
        target_id=ref.id
    )

    return {
        "message": "Tạo sản phẩm thành công",
        "product_id": ref.id,
        "product": {**data, "id": ref.id, "createdAt": now.isoformat(), "updatedAt": now.isoformat()},
    }


@router.get("/products/{product_id}", summary="Chi tiết 1 sản phẩm")
def get_product(
    product_id: str,
    admin: dict = Depends(verify_admin_token),
):
    return _serialize(_get_or_404(product_id).get())


@router.patch("/products/{product_id}", summary="Cập nhật sản phẩm")
def update_product(
    product_id: str,
    body: UpdateProductRequest,
    admin: dict = Depends(verify_admin_token),
):
    ref = _get_or_404(product_id)

    if body.sku is not None:
        for doc in db.collection("products").where("sku", "==", body.sku).limit(1).stream():
            if doc.id != product_id:
                raise HTTPException(400, detail=f"SKU '{body.sku}' đã dùng bởi sản phẩm khác")

    if body.slug is not None:
        for doc in db.collection("products").where("slug", "==", body.slug).limit(1).stream():
            if doc.id != product_id:
                raise HTTPException(400, detail=f"Slug '{body.slug}' đã tồn tại")

    updates: dict = {"updatedAt": datetime.now()}

    for field, value in body.model_dump(exclude_unset=True).items():
        if value is None:
            continue
        if field == "specs":
            updates[field] = [s if isinstance(s, dict) else s for s in value]
        elif field == "name":
            updates[field] = value.strip()
            if body.slug is None:
                updates["slug"] = slugify(value)
        elif field == "stock":
            # frontend gửi "stock" → lưu đúng tên Firestore
            updates["stockQuantity"] = value
        else:
            updates[field] = value

    # Khi cập nhật images: tự đồng bộ thumbnailUrl nếu chưa set
    if "images" in updates:
        images: list[str] = updates["images"]
        if not isinstance(images, list):
            images = []
        updates["images"] = images
        if body.thumbnailUrl is None and images:
            updates["thumbnailUrl"] = images[0]

    # Tự tính discountPercent khi price hoặc originalPrice thay đổi
    current = ref.get().to_dict()
    new_price = updates.get("price", current.get("price"))
    new_orig = updates.get("originalPrice", current.get("originalPrice"))
    if ("price" in updates or "originalPrice" in updates) and new_orig and new_orig > new_price:
        updates.setdefault("discountPercent", round((1 - new_price / new_orig) * 100))

    ref.update(updates)
    
    log_admin_action(
        db, admin,
        action="update_product",
        target_type="product",
        target_id=product_id,
        details={
            "changes": {k: v for k, v in updates.items() if k != "updatedAt"},
            "priceBefore": current.get("price"),
        },
    )
    
    return {"message": "Cập nhật sản phẩm thành công", "product": _serialize(ref.get())}


@router.delete("/products/{product_id}", summary="Xóa sản phẩm")
def delete_product(
    product_id: str,
    admin: dict = Depends(verify_admin_token),
):
    ref = _get_or_404(product_id)
    snapshot = ref.get().to_dict()
    ref.delete()

    log_admin_action(
        db, admin,
        action="delete_product",
        target_type="product",
        target_id=product_id,
        details={"name": snapshot.get("name"), "sku": snapshot.get("sku")},
    )
    
    return {"message": "Đã xóa sản phẩm thành công"}


# ─── Image endpoints ───────────────────────────────────────────────────────────

@router.post("/products/upload-image", summary="Upload ảnh lên Firebase Storage")
async def upload_image(
    file: UploadFile = File(...),
    admin: dict = Depends(verify_admin_token),
):
    # Validate content-type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, detail=f"Chỉ chấp nhận JPG, PNG, WEBP, GIF. Nhận được: {file.content_type}")
 
    content = await file.read()
 
    # Validate kích thước
    if len(content) > MAX_SIZE_BYTES:
        raise HTTPException(400, detail="Ảnh vượt quá 5 MB")
 
    # Tạo đường dẫn duy nhất trong bucket
    try:
        result = cloudinary.uploader.upload(
            content,
            folder="products",          # lưu vào thư mục products trong Cloudinary
            resource_type="image",
            overwrite=False,
        )
        return {"image_url": result["secure_url"]}
    except Exception as e:
        raise HTTPException(500, detail=f"Upload thất bại: {str(e)}")

@router.post("/products/{product_id}/images", summary="Thêm URL ảnh vào sản phẩm")
def add_product_image(
    product_id: str,
    body: dict,  # {"image_url": "https://..."}
    admin: dict = Depends(verify_admin_token),
):
    image_url: str = (body.get("image_url") or "").strip()
    if not image_url:
        raise HTTPException(400, detail="image_url không được để trống")

    ref = _get_or_404(product_id)
    current = ref.get().to_dict()
    images: list[str] = current.get("images") or []

    if image_url in images:
        raise HTTPException(400, detail="Ảnh này đã tồn tại trong sản phẩm")

    images.append(image_url)
    updates = {
        "images": images,
        "updatedAt": datetime.now(),
    }
    # Nếu chưa có thumbnailUrl thì set luôn
    if not current.get("thumbnailUrl"):
        updates["thumbnailUrl"] = image_url

    ref.update(updates)
    return {"message": "Đã thêm ảnh thành công", "images": images}