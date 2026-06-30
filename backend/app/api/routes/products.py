"""
app/api/routes/products.py

GET  /api/products           — Danh sách sản phẩm
GET  /api/products/search    — Tìm kiếm full-text
GET  /api/products/filter    — Lọc nâng cao
GET  /api/products/category/all — Toàn bộ danh mục
GET  /api/products/{id}      — Chi tiết sản phẩm
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status

from app.core.firebase import get_db

router = APIRouter(prefix="/api/products", tags=["Products"])
db = get_db()


@router.get("")
def get_products(
    categoryId: Optional[str] = Query(None),
    status: Optional[str] = Query("active"),
    isFeatured: Optional[bool] = Query(None),
    limit: int = Query(20, le=100),
):
    query = db.collection("products")
    if status:
        query = query.where("status", "==", status)
    if categoryId:
        query = query.where("categoryId", "==", categoryId)
    if isFeatured is not None:
        query = query.where("isFeatured", "==", isFeatured)

    docs = query.limit(limit).stream()
    products = [{"id": doc.id, **doc.to_dict()} for doc in docs]
    return {"products": products, "total": len(products)}


@router.get("/category/all")
def get_categories():
    docs = db.collection("categories").stream()
    categories = [{"id": doc.id, **doc.to_dict()} for doc in docs]
    return {"categories": categories}


@router.get("/search")
def search_products(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, le=100),
    skip: int = Query(0, ge=0),
):
    """
    Full-text search theo tên, brand, categoryName, description, sku.
    Firestore không hỗ trợ native full-text — nên dùng Algolia khi dataset > 1000 sản phẩm.
    """
    keyword = q.strip().lower()
    docs = db.collection("products").where("status", "!=", "hidden").stream()

    matched = []
    for doc in docs:
        p = {"id": doc.id, **doc.to_dict()}
        searchable = " ".join([
            p.get("name", ""), p.get("brand", ""), p.get("categoryName", ""),
            p.get("shortDescription", ""), p.get("description", ""), p.get("sku", ""),
        ]).lower()
        if keyword in searchable:
            matched.append(p)

    matched.sort(key=lambda p: 0 if keyword in p.get("name", "").lower() else 1)
    return {
        "items": matched[skip: skip + limit],
        "total": len(matched),
        "keyword": q,
        "limit": limit,
        "skip": skip,
    }


@router.get("/filter")
def filter_products(
    category: Optional[str] = Query(None),
    price_min: Optional[float] = Query(None, ge=0),
    price_max: Optional[float] = Query(None, ge=0),
    rating_min: Optional[float] = Query(None, ge=0, le=5),
    in_stock: Optional[bool] = Query(None),
    limit: int = Query(20, le=100),
    skip: int = Query(0, ge=0),
):
    query = db.collection("products").where("status", "!=", "hidden")
    if in_stock is True:
        query = query.where("status", "==", "active")

    items = []
    for doc in query.stream():
        p = {"id": doc.id, **doc.to_dict()}

        if category:
            cat = category.lower()
            if not (p.get("categoryId", "").lower() == cat or cat in p.get("categoryName", "").lower()):
                continue
        if price_min is not None and p.get("price", 0) < price_min:
            continue
        if price_max is not None and p.get("price", 0) > price_max:
            continue
        if rating_min is not None and (p.get("rating") or 0) < rating_min:
            continue
        if in_stock is False and p.get("status") != "out_of_stock":
            continue

        items.append(p)

    items.sort(key=lambda p: (0 if p.get("isFeatured") else 1, p.get("price", 0)))

    filters_applied = {k: v for k, v in {
        "category": category, "price_min": price_min, "price_max": price_max,
        "rating_min": rating_min, "in_stock": in_stock,
    }.items() if v is not None}

    return {
        "items": items[skip: skip + limit],
        "total": len(items),
        "filters_applied": filters_applied,
        "limit": limit,
        "skip": skip,
    }


@router.get("/{product_id}")
def get_product(product_id: str):
    doc = db.collection("products").document(product_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")
    
    product_data = doc.to_dict()
    if product_data.get("status") in ["hidden", "draft"]:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")
    
    return {"id": doc.id, **product_data}
