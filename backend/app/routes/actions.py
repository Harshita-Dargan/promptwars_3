from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Action, UserAction, DailyMassLog
from app.schemas import ActionOut, UserActionCompleteOut, AutoVerifyRequest, AutoVerifyOut
from app.services.auth import get_current_user
from datetime import datetime, date

router = APIRouter(prefix="/api/actions", tags=["actions"])

# Predefined Seed Actions
SEED_ACTIONS = [
    {
        "id": "act_train_commute",
        "title": "Switch to Commuter Train",
        "description": "Switch from a gasoline car/SUV to the train for daily work travel.",
        "category": "transit",
        "carbon_saving": 4000.0,
        "difficulty": "medium",
        "auto_verify_provider": "transit_pass_api"
    },
    {
        "id": "act_veg_diet",
        "title": "Adopt a Vegetarian Diet",
        "description": "Remove meat from your daily meals to chip away at agriculture carbon mass.",
        "category": "diet",
        "carbon_saving": 1700.0,
        "difficulty": "medium",
        "auto_verify_provider": None
    },
    {
        "id": "act_solar_power",
        "title": "Switch to Solar Electricity Grid",
        "description": "Enroll in a community solar program or add rooftop solar panels.",
        "category": "energy",
        "carbon_saving": 1200.0,
        "difficulty": "high",
        "auto_verify_provider": "smart_meter_api"
    },
    {
        "id": "act_secondhand_clothing",
        "title": "Buy Clothes Secondhand First",
        "description": "Commit to thrift shops or vintage sites for clothing upgrades rather than new items.",
        "category": "shopping",
        "carbon_saving": 1000.0,
        "difficulty": "low",
        "auto_verify_provider": "digital_receipt_plaid"
    },
    {
        "id": "act_heat_pump",
        "title": "Install an Energy Efficient Heat Pump",
        "description": "Replace your gas heating system with a high-efficiency electric heat pump.",
        "category": "energy",
        "carbon_saving": 2500.0,
        "difficulty": "high",
        "auto_verify_provider": "utility_bill_api"
    },
    {
        "id": "act_carpool",
        "title": "Commute with Carpooling",
        "description": "Share rides with co-workers or neighbors to cut your transit weight in half.",
        "category": "transit",
        "carbon_saving": 1500.0,
        "difficulty": "low",
        "auto_verify_provider": None
    },
    {
        "id": "act_vegan_diet",
        "title": "Go 100% Vegan",
        "description": "Shift to a plant-based diet to maximize food-chain efficiency.",
        "category": "diet",
        "carbon_saving": 2200.0,
        "difficulty": "high",
        "auto_verify_provider": None
    }
]

def seed_actions_if_empty(db: Session):
    count = db.query(Action).count()
    if count == 0:
        for sa in SEED_ACTIONS:
            action = Action(
                id=sa["id"],
                title=sa["title"],
                description=sa["description"],
                category=sa["category"],
                carbon_saving=sa["carbon_saving"],
                difficulty=sa["difficulty"],
                auto_verify_provider=sa["auto_verify_provider"]
            )
            db.add(action)
        db.commit()

@router.get("", response_model=list[ActionOut])
async def list_actions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Ensure database is seeded with defaults
    seed_actions_if_empty(db)

    # Get all actions
    actions = db.query(Action).all()

    # Get user action maps
    user_actions = db.query(UserAction).filter(UserAction.user_id == current_user.id).all()
    ua_map = {ua.action_id: ua for ua in user_actions}

    # Format list
    result = []
    for action in actions:
        ua = ua_map.get(action.id)
        result.append(
            ActionOut(
                id=action.id,
                title=action.title,
                description=action.description,
                category=action.category,
                carbon_saving=action.carbon_saving,
                difficulty=action.difficulty,
                auto_verify_provider=action.auto_verify_provider,
                user_status=ua.status if ua else None,
                verified=ua.verified if ua else False
            )
        )
    return result

@router.post("/{action_id}/start")
async def start_action(
    action_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    action = db.query(Action).filter(Action.id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")

    ua = db.query(UserAction).filter(
        UserAction.user_id == current_user.id,
        UserAction.action_id == action_id
    ).first()

    if ua:
        if ua.status == "completed":
            raise HTTPException(status_code=400, detail="Action already completed")
        ua.status = "active"
        ua.updated_at = datetime.utcnow()
    else:
        ua = UserAction(
            user_id=current_user.id,
            action_id=action_id,
            status="active"
        )
        db.add(ua)

    db.commit()
    return {"message": "Action activated.", "action_id": action_id, "user_status": "active"}

@router.post("/{action_id}/complete", response_model=UserActionCompleteOut)
async def complete_action(
    action_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    action = db.query(Action).filter(Action.id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")

    ua = db.query(UserAction).filter(
        UserAction.user_id == current_user.id,
        UserAction.action_id == action_id
    ).first()

    # Track prior status to calculate changes properly
    already_completed = False
    if ua:
        if ua.status == "completed":
            already_completed = True
        ua.status = "completed"
        ua.verified = True
        ua.verified_at = datetime.utcnow()
        ua.updated_at = datetime.utcnow()
    else:
        ua = UserAction(
            user_id=current_user.id,
            action_id=action_id,
            status="completed",
            verified=True,
            verified_at=datetime.utcnow()
        )
        db.add(ua)

    previous_mass = current_user.current_mass

    # Subtract saving if we weren't already completed
    if not already_completed:
        current_user.current_mass = max(0.0, current_user.current_mass - action.carbon_saving)
        # Recalculate Altitude
        if current_user.baseline_mass > 0:
            pct_reduction = (current_user.baseline_mass - current_user.current_mass) / current_user.baseline_mass
            current_user.altitude = max(0.0, pct_reduction * 10000.0) # ceiling of 10k
        else:
            current_user.altitude = 0.0

    # Save to history log for today
    log = db.query(DailyMassLog).filter(
        DailyMassLog.user_id == current_user.id,
        DailyMassLog.log_date == date.today()
    ).first()

    if log:
        log.mass_debt = current_user.current_mass
        log.altitude = current_user.altitude
    else:
        log = DailyMassLog(
            user_id=current_user.id,
            log_date=date.today(),
            mass_debt=current_user.current_mass,
            altitude=current_user.altitude
        )
        db.add(log)

    db.commit()
    db.refresh(current_user)

    altitude_gain = current_user.altitude - (
        ((current_user.baseline_mass - previous_mass) / current_user.baseline_mass * 10000.0)
        if current_user.baseline_mass > 0 else 0.0
    )

    return {
        "message": f"Action completed successfully. You chipped away {action.carbon_saving:.0f} kg of carbon debt!",
        "previous_mass": previous_mass,
        "new_mass": current_user.current_mass,
        "altitude_gain_m": max(0.0, altitude_gain),
        "new_altitude": current_user.altitude
    }

@router.post("/{action_id}/verify", response_model=AutoVerifyOut)
async def auto_verify_action(
    action_id: str,
    verify_req: AutoVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    action = db.query(Action).filter(Action.id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")

    if not action.auto_verify_provider:
        raise HTTPException(status_code=400, detail="This action does not support automated API verification")

    if verify_req.provider != action.auto_verify_provider:
        raise HTTPException(status_code=400, detail="Provider mismatch for this action")

    # In a production app, verify payload signatures/integrations.
    # Here, we parse the mockup payload and process verification.
    payload = verify_req.payload
    is_verified = True
    saving_modifier = 1.0  # optional multiplier based on utility performance data

    # Dynamic adjustments based on smart meter readings
    if verify_req.provider == "smart_meter_api":
        reduction = payload.get("avg_daily_kwh_reduction", 0.0)
        if reduction <= 0:
            is_verified = False
        else:
            # Scale saving based on kwh reduction rate
            saving_modifier = min(2.0, max(0.5, reduction / 4.0))

    if not is_verified:
        raise HTTPException(status_code=400, detail="Automated verification failed based on provider readings")

    ua = db.query(UserAction).filter(
        UserAction.user_id == current_user.id,
        UserAction.action_id == action_id
    ).first()

    already_completed = False
    if ua:
        if ua.status == "completed":
            already_completed = True
        ua.status = "completed"
        ua.verified = True
        ua.verified_at = datetime.utcnow()
        ua.verification_source = "api_auto_verify"
        ua.updated_at = datetime.utcnow()
    else:
        ua = UserAction(
            user_id=current_user.id,
            action_id=action_id,
            status="completed",
            verified=True,
            verified_at=datetime.utcnow(),
            verification_source="api_auto_verify"
        )
        db.add(ua)

    actual_savings = action.carbon_saving * saving_modifier
    previous_mass = current_user.current_mass

    if not already_completed:
        current_user.current_mass = max(0.0, current_user.current_mass - actual_savings)
        if current_user.baseline_mass > 0:
            pct = (current_user.baseline_mass - current_user.current_mass) / current_user.baseline_mass
            current_user.altitude = max(0.0, pct * 10000.0)
        else:
            current_user.altitude = 0.0

    # Save to history log
    log = db.query(DailyMassLog).filter(
        DailyMassLog.user_id == current_user.id,
        DailyMassLog.log_date == date.today()
    ).first()

    if log:
        log.mass_debt = current_user.current_mass
        log.altitude = current_user.altitude
    else:
        log = DailyMassLog(
            user_id=current_user.id,
            log_date=date.today(),
            mass_debt=current_user.current_mass,
            altitude=current_user.altitude
        )
        db.add(log)

    db.commit()
    db.refresh(current_user)

    return {
        "verified": True,
        "verification_source": "api_auto_verify",
        "carbon_saving_verified_kg": actual_savings,
        "new_mass": current_user.current_mass,
        "new_altitude": current_user.altitude
    }
