"""
app/core/inventory.py

Logic hoàn kho dùng chung giữa user tự huỷ đơn (orders.py)
và admin chuyển trạng thái đơn sang cancelled (admin_orders.py).
"""

from datetime import datetime


def restock_order_items(db, items: list[dict]) -> None:
    """Hoàn lại stockQuantity cho từng sản phẩm trong đơn hàng bị huỷ."""
    for item in items:
        product_ref = db.collection("products").document(item["productId"])
        snap = product_ref.get()
        if not snap.exists:
            continue
        new_stock = snap.to_dict().get("stockQuantity", 0) + item["quantity"]
        updates = {"stockQuantity": new_stock, "updatedAt": datetime.now()}
        # Nếu sản phẩm đang out_of_stock, hoàn kho thì mở bán lại
        if snap.to_dict().get("status") == "out_of_stock":
            updates["status"] = "active"
        product_ref.update(updates)