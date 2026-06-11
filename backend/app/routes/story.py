from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, EcosystemStory, UserAction, Action
from app.schemas import StoryOut
from app.services.auth import get_current_user
from app.services.story_engine import generate_ecosystem_story

router = APIRouter(prefix="/api/story", tags=["story"])

@router.get("/latest", response_model=StoryOut)
async def get_latest_story(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    story = db.query(EcosystemStory).filter(
        EcosystemStory.user_id == current_user.id
    ).order_by(EcosystemStory.created_at.desc()).first()

    if not story:
        # Generate initial default story if none exists
        story_data = await generate_ecosystem_story(
            baseline_mass=current_user.baseline_mass,
            current_mass=current_user.current_mass,
            completed_actions=[],
            active_actions=[]
        )
        
        story = EcosystemStory(
            user_id=current_user.id,
            story_text=story_data["story_text"],
            environmental_state=story_data["environmental_state"]
        )
        db.add(story)
        db.commit()
        db.refresh(story)

    return story

@router.post("/regenerate", response_model=StoryOut)
async def regenerate_story(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.onboarding_completed:
        raise HTTPException(status_code=400, detail="Onboarding baseline must be completed first")

    # Get active and completed actions
    user_actions = db.query(UserAction).filter(UserAction.user_id == current_user.id).all()
    
    completed_titles = []
    active_titles = []
    
    for ua in user_actions:
        action = db.query(Action).filter(Action.id == ua.action_id).first()
        if action:
            if ua.status == "completed":
                completed_titles.append(action.title)
            elif ua.status == "active":
                active_titles.append(action.title)

    # Generate from model/template
    story_data = await generate_ecosystem_story(
        baseline_mass=current_user.baseline_mass,
        current_mass=current_user.current_mass,
        completed_actions=completed_titles,
        active_actions=active_titles
    )

    # Save to history log
    new_story = EcosystemStory(
        user_id=current_user.id,
        story_text=story_data["story_text"],
        environmental_state=story_data["environmental_state"]
    )
    db.add(new_story)
    db.commit()
    db.refresh(new_story)

    return new_story
