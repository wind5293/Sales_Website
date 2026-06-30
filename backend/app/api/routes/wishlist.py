"""
app/api/routes/wishlist.py

GET    /api/wishlists/items              — Xem danh sách yêu thích
POST   /api/wishlists/items/{product_id} — Thêm sản phẩm
DELETE /api/wishlists/items/{product_id} — Xóa sản phẩm
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.firebase import get_db
from app.core.security import get_uid, verify_token

router = APIRouter(prefix="/api/wishlists", tags=["Wishlist"])
db = get_db()


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/items")
def get_wishlist(decoded_token: dict = Depends(verify_token)):
    uid = get_uid(decoded_token)

    docs = (
        db.collection("wishlists")
        .where("userId", "==", uid)
        .order_by("addedAt", direction="DESCENDING")
        .stream()
    )

    items = []
    for doc in docs:
        entry = doc.to_dict()
        product_id = entry.get("productId")

        product_doc = db.collection("products").document(product_id).get()
        if not product_doc.exists:
            continue  # Bỏ qua sản phẩm đã bị xóa

        product = product_doc.to_dict()
        product["id"] = product_id

        added_at = entry.get("addedAt")
        if hasattr(added_at, "isoformat"):
            added_at = added_at.isoformat()

        items.append({
            "wishlistId": doc.id,
            "addedAt": added_at,
            "product": product,
        })

    return {"items": items, "total": len(items)}


@router.post("/items/{product_id}", status_code=status.HTTP_201_CREATED)
def add_to_wishlist(product_id: str, decoded_token: dict = Depends(verify_token)):
    uid = get_uid(decoded_token)

    # Kiểm tra sản phẩm tồn tại
    product_doc = db.collection("products").document(product_id).get()
    if not product_doc.exists:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")

    # Kiểm tra trùng
    existing = list(
        db.collection("wishlists")
        .where("userId", "==", uid)
        .where("productId", "==", product_id)
        .limit(1)
        .stream()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Sản phẩm đã có trong danh sách yêu thích")

    _, ref = db.collection("wishlists").add({
        "userId": uid,
        "productId": product_id,
        "addedAt": datetime.now(),
    })

    return {
        "message": "Đã thêm vào danh sách yêu thích",
        "wishlistId": ref.id,
        "productId": product_id,
    }


@router.delete("/items/{product_id}")
def remove_from_wishlist(product_id: str, decoded_token: dict = Depends(verify_token)):
    uid = get_uid(decoded_token)

    docs = list(
        db.collection("wishlists")
        .where("userId", "==", uid)
        .where("productId", "==", product_id)
        .limit(1)
        .stream()
    )

    if not docs:
        raise HTTPException(status_code=404, detail="Sản phẩm không có trong danh sách yêu thích")

    docs[0].reference.delete()
    return {"message": "Đã xóa khỏi danh sách yêu thích", "productId": product_id}