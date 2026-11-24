

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.api.routes import router
from app.core.config import get_settings

settings = get_settings()

# Initialize FastAPI application
app = FastAPI(
    title=settings.app_name,
    description="Enterprise IT Support RAG Assistant",
    version="1.0.0"
)

# Configure frontend directories
templates = Jinja2Templates(directory="templates")

app.mount(
    "/static",
    StaticFiles(directory="static"),
    name="static"
)


# Serve frontend
@app.get("/")
async def home(request: Request):
    return templates.TemplateResponse(
        "index.html",
        {"request": request}
    )


# Register API endpoints
app.include_router(router)


# Application health check
@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": settings.app_name
    }
