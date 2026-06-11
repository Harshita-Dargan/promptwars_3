from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, date

# --- Auth Schemas ---
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    id: str
    username: str
    email: EmailStr
    baseline_mass: float
    current_mass: float
    altitude: float
    onboarding_completed: bool

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut

class TokenData(BaseModel):
    username: Optional[str] = None

# --- Quiz Schemas ---
class QuizSubmit(BaseModel):
    responses: Dict[str, str]

class QuizResponseOut(BaseModel):
    message: str
    baseline_mass: float
    current_mass: float
    altitude: float
    onboarding_completed: bool

# --- Action Schemas ---
class ActionOut(BaseModel):
    id: str
    title: str
    description: str
    category: str
    carbon_saving: float
    difficulty: str
    auto_verify_provider: Optional[str] = None
    user_status: Optional[str] = None # 'active', 'completed', 'skipped', or null
    verified: bool = False

    class Config:
        from_attributes = True

class UserActionCompleteOut(BaseModel):
    message: str
    previous_mass: float
    new_mass: float
    altitude_gain_m: float
    new_altitude: float

class AutoVerifyRequest(BaseModel):
    provider: str
    payload: Dict[str, Any]

class AutoVerifyOut(BaseModel):
    verified: bool
    verification_source: str
    carbon_saving_verified_kg: float
    new_mass: float
    new_altitude: float

# --- Story Schemas ---
class StoryOut(BaseModel):
    story_text: str
    environmental_state: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Leaderboard Schemas ---
class LeaderboardUserOut(BaseModel):
    rank: int
    username: str
    altitude: float
    current_mass: float
    baseline_mass: float

class LeaderboardOut(BaseModel):
    leaderboard: List[LeaderboardUserOut]

# --- Progress Schemas ---
class ProgressLogOut(BaseModel):
    date: date
    mass_debt: float
    altitude: float

class ProgressHistoryOut(BaseModel):
    history: List[ProgressLogOut]
