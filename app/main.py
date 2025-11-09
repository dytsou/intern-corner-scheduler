import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.api import scheduler

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Round-Table Scheduler API",
    description="API for generating round-table seating schedules with constraints",
    version="1.0.0",
)

# Configure CORS from environment variables
cors_origins = os.getenv("CORS_ORIGINS", "*")
if cors_origins == "*":
    allow_origins = ["*"]
    allow_credentials = False
else:
    allow_origins = [origin.strip() for origin in cors_origins.split(",")]
    allow_credentials = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(scheduler.router, prefix="/api", tags=["scheduler"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Round-Table Scheduler API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}
