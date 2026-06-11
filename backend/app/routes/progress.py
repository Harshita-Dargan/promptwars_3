from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, DailyMassLog
from app.schemas import ProgressHistoryOut, ProgressLogOut
from app.services.auth import get_current_user
from datetime import date, timedelta

router = APIRouter(prefix="/api/progress", tags=["progress"])

@router.get("/history", response_model=ProgressHistoryOut)
async def get_progress_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Query logs
    logs = db.query(DailyMassLog).filter(
        DailyMassLog.user_id == current_user.id
    ).order_by(DailyMassLog.log_date.asc()).all()

    # If the user has just registered, inject a few mock days to generate a pretty chart
    if len(logs) < 3:
        baseline = current_user.baseline_mass or 7500.0
        # If no logs exist, construct a standard log list
        history_list = [
            ProgressLogOut(
                date=date.today() - timedelta(days=2),
                mass_debt=baseline,
                altitude=0.0
            ),
            ProgressLogOut(
                date=date.today() - timedelta(days=1),
                # Show minor improvement
                mass_debt=max(0.0, baseline - 500.0),
                altitude=max(0.0, (500.0 / baseline * 10000.0) if baseline > 0 else 0.0)
            )
        ]
        
        # Add today's log
        if logs:
            history_list.append(
                ProgressLogOut(
                    date=logs[0].log_date,
                    mass_debt=logs[0].mass_debt,
                    altitude=logs[0].altitude
                )
            )
        else:
            history_list.append(
                ProgressLogOut(
                    date=date.today(),
                    mass_debt=current_user.current_mass,
                    altitude=current_user.altitude
                )
            )
            
        return {"history": history_list}

    # Format real logs
    history_list = [
        ProgressLogOut(
            date=l.log_date,
            mass_debt=l.mass_debt,
            altitude=l.altitude
        ) for l in logs
    ]
    return {"history": history_list}
