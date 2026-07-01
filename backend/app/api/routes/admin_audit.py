"""
app/api/routes/admin_audit.py

GET /api/admin/audit-logs — Danh sách audit log (phân trang + lọc)
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.firebase import get_db
from app.core.security import verify_admin_token

router = APIRouter(prefix="/api/admin", tags=["Admin - Audit Log"])
db = get_db()


def _serialize(doc) -> dict:
    d = doc.to_dict()
    d["id"] = doc.id
    if d.get("createdAt") and hasattr(d["createdAt"], "isoformat"):
        d["createdAt"] = d["createdAt"].isoformat()
    return d


@router.get("/audit-logs", summary="Danh sách audit log (phân trang + lọc)")
def list_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    targetType: Optional[str] = Query(None, description="user | order | product"),
    action: Optional[str] = Query(None, description="vd. update_user, delete_product..."),
    adminEmail: Optional[str] = Query(None, description="Lọc theo email admin thực hiện"),
    admin: dict = Depends(verify_admin_token),
):
    query = db.collection("audit_logs").order_by("createdAt", direction="DESCENDING")

    # Firestore-side filters (equality)
    if targetType:
        query = query.where("targetType", "==", targetType)
    if action:
        query = query.where("action", "==", action)

    has_python_filter = bool(adminEmail)

    if not has_python_filter:
        total_docs = list(query.stream())
        total = len(total_docs)
        paginated = [_serialize(doc) for doc in query.offset(skip).limit(limit).stream()]
        return {"logs": paginated, "total": total}

    all_docs = [_serialize(doc) for doc in query.stream()]
    email_lower = adminEmail.strip().lower()
    all_docs = [d for d in all_docs if email_lower in (d.get("adminEmail") or "").lower()]

    total = len(all_docs)
    return {"logs": all_docs[skip: skip + limit], "total": total}