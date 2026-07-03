import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from . import models
from .database import engine
from .routers import auth, syllabus, plan, users

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Study Scheduler API")

# CORS_ORIGINS env var: comma-separated list, e.g.
# "http://localhost:5173,https://your-app.vercel.app"
default_origins = "http://localhost:5173,http://localhost:3000"
origins = [o.strip() for o in os.getenv("CORS_ORIGINS", default_origins).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(syllabus.router)
app.include_router(plan.router)
app.include_router(users.router)


@app.get("/")
def root():
    return {"status": "ok", "message": "Study Scheduler API is running"}
