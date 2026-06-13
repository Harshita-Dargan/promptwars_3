from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import LeaderboardOut, LeaderboardUserOut
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])

MOCK_LEADERBOARD = [
    { "username": "sky_drifter", "altitude": 8200.0, "current_mass": 1200.0, "baseline_mass": 6600.0 },
    { "username": "vapor_float", "altitude": 6800.0, "current_mass": 2100.0, "baseline_mass": 6500.0 },
    { "username": "eco_soarer", "altitude": 4800.0, "current_mass": 3640.0, "baseline_mass": 7000.0 },
    { "username": "heavy_boulder", "altitude": 800.0, "current_mass": 8100.0, "baseline_mass": 8800.0 }
]

@router.get("", response_model=LeaderboardOut)
async def get_leaderboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Fetch real users who have onboarded, sorted by altitude descending, limited to top 50 to avoid memory bottlenecks
    users = db.query(User).filter(
        User.onboarding_completed == True
    ).order_by(User.altitude.desc()).limit(50).all()

    # Compile leaderboard entries
    entries = []
    for u in users:
        entries.append({
            "username": u.username,
            "altitude": u.altitude,
            "current_mass": u.current_mass,
            "baseline_mass": u.baseline_mass
        })

    # Add mock entries to populate the ranking lists on first launch
    for mock in MOCK_LEADERBOARD:
        # Check that we don't duplicate a username in testing
        if not any(e["username"] == mock["username"] for e in entries):
            entries.append(mock)

    # Sort by altitude descending (lightest floats highest)
    entries.sort(key=lambda x: x["altitude"], reverse=True)

    # Apply rank values
    leaderboard_users = []
    for rank, entry in enumerate(entries, 1):
        leaderboard_users.append(
            LeaderboardUserOut(
                rank=rank,
                username=entry["username"],
                altitude=entry["altitude"],
                current_mass=entry["current_mass"],
                baseline_mass=entry["baseline_mass"]
            )
        )

    return {"leaderboard": leaderboard_users}
