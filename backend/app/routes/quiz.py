from fastapi import APIRouter, Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, QuizResponse, DailyMassLog, EcosystemStory
from app.schemas import QuizSubmit, QuizResponseOut
from app.services.auth import get_current_user
from app.services.story_engine import generate_ecosystem_story
from datetime import date

router = APIRouter(prefix="/api/quiz", tags=["quiz"])

# Define quiz questions statically for simplicity and performance
QUIZ_QUESTIONS = [
    {
        "id": "q1_transit",
        "question": "What is your primary mode of daily transportation?",
        "category": "transit",
        "options": [
            { "value": "suv_gas", "label": "Large SUV/Truck (Gasoline)", "mass_factor_kg": 4600 },
            { "value": "sedan_gas", "label": "Standard Sedan (Gasoline)", "mass_factor_kg": 3200 },
            { "value": "ev", "label": "Electric Vehicle (EV)", "mass_factor_kg": 1100 },
            { "value": "public_transit", "label": "Public Transit (Bus/Train)", "mass_factor_kg": 600 },
            { "value": "walk_bike", "label": "Walk / Bike / Active Transit", "mass_factor_kg": 0 }
        ]
    },
    {
        "id": "q2_diet",
        "question": "Which of these best describes your daily diet?",
        "category": "diet",
        "options": [
            { "value": "heavy_meat", "label": "Frequent Meat & Dairy (daily)", "mass_factor_kg": 2900 },
            { "value": "low_meat", "label": "Low Meat / Flexitarian", "mass_factor_kg": 1700 },
            { "value": "vegetarian", "label": "Vegetarian", "mass_factor_kg": 1200 },
            { "value": "vegan", "label": "Vegan", "mass_factor_kg": 700 }
        ]
    },
    {
        "id": "q3_home_energy",
        "question": "How is your home primarily heated and powered?",
        "category": "energy",
        "options": [
            { "value": "coal_gas", "label": "Fossil Fuels (Coal / Natural Gas)", "mass_factor_kg": 3000 },
            { "value": "mixed_electric", "label": "Standard Power Grid (Mixed Sources)", "mass_factor_kg": 1500 },
            { "value": "solar_wind", "label": "100% Renewable / Solar / Wind", "mass_factor_kg": 300 }
        ]
    },
    {
        "id": "q4_flights",
        "question": "How many round-trip flights do you take each year?",
        "category": "transit",
        "options": [
            { "value": "none", "label": "None (No flights)", "mass_factor_kg": 0 },
            { "value": "occasional", "label": "1 - 2 flights (Short/Medium haul)", "mass_factor_kg": 1200 },
            { "value": "frequent", "label": "3 - 5 flights (Long haul)", "mass_factor_kg": 4000 },
            { "value": "excessive", "label": "6+ flights", "mass_factor_kg": 9000 }
        ]
    },
    {
        "id": "q5_shopping",
        "question": "What is your typical consumption/shopping habit?",
        "category": "shopping",
        "options": [
            { "value": "minimalist", "label": "Minimalist (Second-hand, rarely buy new)", "mass_factor_kg": 400 },
            { "value": "average", "label": "Average (Buy standard new items occasionally)", "mass_factor_kg": 1400 },
            { "value": "frequent_buyer", "label": "Frequent (Always upgrading tech, buying fast fashion)", "mass_factor_kg": 3500 }
        ]
    }
]

@router.get("/questions")
async def get_questions(current_user: User = Depends(get_current_user)):
    return {"questions": QUIZ_QUESTIONS}

@router.post("/submit", response_model=QuizResponseOut)
async def submit_quiz(
    payload: QuizSubmit,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    calculated_mass = 0.0
    responses = payload.responses

    # Map question IDs to options list
    question_map = {q["id"]: q for q in QUIZ_QUESTIONS}

    for question_id, chosen_value in responses.items():
        if question_id in question_map:
            question = question_map[question_id]
            # Find options factor
            option = next((opt for opt in question["options"] if opt["value"] == chosen_value), None)
            if option:
                calculated_mass += option["mass_factor_kg"]

    # Minimum fallback baseline if user submits empty or zero footprint answers
    if calculated_mass <= 0:
        calculated_mass = 1200.0  # standard base footprint

    # 1. Update user metrics
    current_user.baseline_mass = calculated_mass
    current_user.current_mass = calculated_mass
    current_user.altitude = 0.0  # grounded with total debt
    current_user.onboarding_completed = True

    # 2. Save quiz responses
    new_response = QuizResponse(
        user_id=current_user.id,
        answers=responses,
        calculated_mass=calculated_mass
    )
    db.add(new_response)

    # 3. Log first progress entry
    # Check if a log already exists for today
    existing_log = db.query(DailyMassLog).filter(
        DailyMassLog.user_id == current_user.id,
        DailyMassLog.log_date == date.today()
    ).first()
    
    if existing_log:
        existing_log.mass_debt = calculated_mass
        existing_log.altitude = 0.0
    else:
        new_log = DailyMassLog(
            user_id=current_user.id,
            log_date=date.today(),
            mass_debt=calculated_mass,
            altitude=0.0
        )
        db.add(new_log)

    db.commit()

    # 4. Generate starting story text
    story_data = await generate_ecosystem_story(
        baseline_mass=calculated_mass,
        current_mass=calculated_mass,
        completed_actions=[],
        active_actions=[]
    )

    new_story = EcosystemStory(
        user_id=current_user.id,
        story_text=story_data["story_text"],
        environmental_state=story_data["environmental_state"]
    )
    db.add(new_story)
    db.commit()

    db.refresh(current_user)

    return {
        "message": "Baseline calculated and saved.",
        "baseline_mass": current_user.baseline_mass,
        "current_mass": current_user.current_mass,
        "altitude": current_user.altitude,
        "onboarding_completed": current_user.onboarding_completed
    }
