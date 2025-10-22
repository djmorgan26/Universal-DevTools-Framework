"""
FastAPI Application Entry Point
"""
from fastapi import FastAPI
from app.routes import health

app = FastAPI(
    title="My FastAPI App",
    description="Created with DevTools Framework",
    version="1.0.0"
)

# Include routers
app.include_router(health.router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to FastAPI",
        "docs": "/docs",
        "health": "/health"
    }
