from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import init_db
from app.routers import auth, examples, experiments, history, prompts

settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title=settings.app_name,
    description="API for improving and evaluating prompts",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(prompts.router, prefix="/api")
app.include_router(examples.router, prefix="/api")
app.include_router(history.router, prefix="/api")
app.include_router(experiments.router, prefix="/api")


@app.get("/")
def root() -> dict:
    return {"message": "Welcome to PromptLab API", "docs": "/docs"}


@app.get("/health")
def health_check() -> dict:
    return {
        "status": "ok",
        "gemini_configured": bool(settings.gemini_api_key),
    }
