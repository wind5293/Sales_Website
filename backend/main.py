import os

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import router

app = FastAPI(
    title="Sales Website API",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

_allowed_origins_env = os.environ.get("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = (
    [o.strip() for o in _allowed_origins_env.split(",") if o.strip()]
    if _allowed_origins_env
    else ["http://localhost:5173", "http://127.0.0.1:5173"]
)

app.include_router(router)


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}
