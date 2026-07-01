"""
app/core/audit.py

Ghi log cho các hành động của admin (sửa giá, xóa sản phẩm, ban user, đổi trạng thái đơn...).
Dùng để truy vết khi có tranh chấp/sai sót.
"""

import logging
from datetime import datetime

logger = logging.getLogger(__name__)


def log_admin_action(
    db,
    admin: dict,
    action: str,
    target_type: str,
    target_id: str,
    details: dict | None = None,
):
    """
    Ghi 1 dòng audit log.

    admin: dict decoded từ verify_admin_token (payload JWT: sub, email, role, permissions)
    action: vd. "update_user", "delete_user", "update_order_status", "delete_product"
    target_type: vd. "user", "order", "product"
    target_id: id của đối tượng bị tác động
    details: dữ liệu bổ sung, vd. {"changes": {...}}
    """
    try:
        db.collection("audit_logs").add({
            "adminId": admin.get("sub", "unknown"),
            "adminEmail": admin.get("email", ""),
            "action": action,
            "targetType": target_type,
            "targetId": target_id,
            "details": details or {},
            "createdAt": datetime.now(),
        })
    except Exception:
        # Audit log không được phép làm fail request chính
        logger.exception(f"Không ghi được audit log: {action} {target_type}={target_id}")