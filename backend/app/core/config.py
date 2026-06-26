import os

# ── Firebase ──────────────────────────────────────────────────────────────────
FIREBASE_WEB_API_KEY: str = os.environ.get("FIREBASE_WEB_API_KEY", "")
FIREBASE_SIGN_IN_URL: str = (
    f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword"
    f"?key={FIREBASE_WEB_API_KEY}"
)

# ── Admin JWT ─────────────────────────────────────────────────────────────────
SECRET_KEY: str = os.getenv("ADMIN_JWT_SECRET", "change-this-secret-in-production")
ALGORITHM: str = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS: int = 12

# ── Shipping ──────────────────────────────────────────────────────────────────
SHIPPING_PRICES: dict = {
    "fast": 30000,
    "standard": 15000,
    "express": 60000,
}

# ── Vouchers (sau này chuyển sang Firestore collection "vouchers") ────────────
VOUCHERS: dict = {
    "GIAM50K":  {"discount": 50000, "percent": None, "minOrder": 500000},
    "FREESHIP": {"discount": 30000, "percent": None, "minOrder": 200000},
    "SALE10":   {"discount": None,  "percent": 10,   "minOrder": 300000},
}
