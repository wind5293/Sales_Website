from dotenv import load_dotenv
load_dotenv()  

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, products, cart, orders

app = FastAPI(
    title="Apple Store API",
    description="Backend cho web bán hàng Apple",
    version="1.0.0"
)

# CORS — cho phép React frontend gọi API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gắn các router
app.include_router(auth.router)
app.include_router(products.router)

@app.get("/")
def root():
    return {"message": "Apple Store API đang chạy"}