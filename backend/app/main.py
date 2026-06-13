import time
from collections import defaultdict
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
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

# Custom Rate Limiting Middleware for sensitive auth endpoints
class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, limit: int = 10, window: int = 60):
        super().__init__(app)
        self.limit = limit
        self.window = window
        self.requests = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        if request.url.path in ["/api/auth/register", "/api/auth/login"]:
            client_ip = request.client.host if request.client else "unknown"
            now = time.time()
            self.requests[client_ip] = [t for t in self.requests[client_ip] if now - t < self.window]
            
            if len(self.requests[client_ip]) >= self.limit:
                return Response(
                    content='{"detail": "Too many attempts. Please try again in a minute."}',
                    status_code=429,
                    media_type="application/json"
                )
            self.requests[client_ip].append(now)
            
        return await call_next(request)

# Custom Security Headers Middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none';"
        return response

app.add_middleware(RateLimitMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

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
