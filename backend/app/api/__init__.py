from fastapi import APIRouter

from app.api.routes import (
    admin_auth,
    admin_products,
    auth,
    cart,
    orders,
    products,
    reviews,
    users,
)

router = APIRouter()

router.include_router(auth.router)
router.include_router(users.router)
router.include_router(products.router)
router.include_router(cart.router)
router.include_router(orders.router)
router.include_router(reviews.router)
router.include_router(admin_auth.router)
router.include_router(admin_products.router)
