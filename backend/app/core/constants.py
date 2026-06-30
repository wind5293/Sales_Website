"""
app/core/constants.py

Định nghĩa rank dùng chung toàn hệ thống — single source of truth.
Tránh lặp lại / lệch nhau giữa các module (lỗi 14).
"""

RANK_THRESHOLDS = {"Silver": 0, "Gold": 500, "Diamond": 2000}
VALID_RANKS = set(RANK_THRESHOLDS.keys())


def compute_rank(points: int) -> str:
    if points >= RANK_THRESHOLDS["Diamond"]:
        return "Diamond"
    if points >= RANK_THRESHOLDS["Gold"]:
        return "Gold"
    return "Silver"