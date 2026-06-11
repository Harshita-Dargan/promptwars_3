from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.routes import auth, quiz, actions, story, leaderboard, progress

# Create database tables automatically
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for the Carbon Footprint Awareness Web App",
    version="1.0.0"
)

# Enable CORS for Next.js app communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://carbon-frontend-389647032950.us-central1.run.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router)
app.include_router(quiz.router)
app.include_router(actions.router)
app.include_router(story.router)
app.include_router(leaderboard.router)
app.include_router(progress.router)

@app.get("/")
async def root():
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "message": "Welcome to the weightless atmosphere."
    }
