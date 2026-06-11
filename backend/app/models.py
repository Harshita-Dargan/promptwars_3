import uuid
from sqlalchemy import Column, String, Float, Boolean, DateTime, Integer, JSON, ForeignKey, Date, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, date
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    baseline_mass = Column(Float, default=0.0)
    current_mass = Column(Float, default=0.0)
    altitude = Column(Float, default=0.0)
    onboarding_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    quiz_responses = relationship("QuizResponse", back_populates="user", cascade="all, delete-orphan")
    actions = relationship("UserAction", back_populates="user", cascade="all, delete-orphan")
    daily_logs = relationship("DailyMassLog", back_populates="user", cascade="all, delete-orphan")
    stories = relationship("EcosystemStory", back_populates="user", cascade="all, delete-orphan")

class QuizResponse(Base):
    __tablename__ = "quiz_responses"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    answers = Column(JSON, nullable=False)
    calculated_mass = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="quiz_responses")

class Action(Base):
    __tablename__ = "actions"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    category = Column(String, nullable=False) # 'transit', 'diet', 'energy', 'shopping'
    carbon_saving = Column(Float, nullable=False) # Mass saved in kg CO2/year
    difficulty = Column(String, nullable=False) # 'low', 'medium', 'high'
    auto_verify_provider = Column(String, nullable=True) # e.g. 'smart_meter_api', NULL
    verification_schema = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user_actions = relationship("UserAction", back_populates="action", cascade="all, delete-orphan")

class UserAction(Base):
    __tablename__ = "user_actions"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    action_id = Column(String, ForeignKey("actions.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, default="active") # 'active', 'completed', 'skipped'
    verified = Column(Boolean, default=False)
    verified_at = Column(DateTime, nullable=True)
    verification_source = Column(String, default="manual") # 'manual', 'api_auto_verify'
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (UniqueConstraint('user_id', 'action_id', name='_user_action_uc'),)

    user = relationship("User", back_populates="actions")
    action = relationship("Action", back_populates="user_actions")

class DailyMassLog(Base):
    __tablename__ = "daily_mass_log"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    log_date = Column(Date, default=date.today)
    mass_debt = Column(Float, nullable=False)
    altitude = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (UniqueConstraint('user_id', 'log_date', name='_user_log_date_uc'),)

    user = relationship("User", back_populates="daily_logs")

class EcosystemStory(Base):
    __tablename__ = "ecosystem_stories"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    story_text = Column(String, nullable=False)
    environmental_state = Column(String, nullable=False) # 'foggy_abyss', 'cracked_earth', 'misty_hill', 'clear_sky'
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="stories")
