import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db
from app.models import User, Action, UserAction
from app.routes.actions import SEED_ACTIONS

# Use a test SQLite database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Override get_db dependency
def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    # Seed actions
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
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)

client = TestClient(app)

def test_auth_flow():
    # 1. Register User
    reg_response = client.post(
        "/api/auth/register",
        json={"username": "testuser", "email": "testuser@example.com", "password": "password123"}
    )
    assert reg_response.status_code == 201
    assert reg_response.json()["username"] == "testuser"

    # 2. Duplicate Register Username Error
    reg_response2 = client.post(
        "/api/auth/register",
        json={"username": "testuser", "email": "testuser2@example.com", "password": "password123"}
    )
    assert reg_response2.status_code == 400

    # 3. Login User
    login_response = client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "password123"}
    )
    assert login_response.status_code == 200
    assert "access_token" in login_response.json()

def test_quiz_and_actions():
    # Register & Login
    client.post(
        "/api/auth/register",
        json={"username": "user1", "email": "user1@example.com", "password": "password123"}
    )
    login_res = client.post(
        "/api/auth/login",
        json={"username": "user1", "password": "password123"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch quiz questions
    q_res = client.get("/api/quiz/questions", headers=headers)
    assert q_res.status_code == 200
    assert "questions" in q_res.json()

    # Submit quiz answers
    submit_res = client.post(
        "/api/quiz/submit",
        headers=headers,
        json={"responses": {"q1_transit": "sedan_gas", "q2_diet": "low_meat", "q3_home_energy": "mixed_electric"}}
    )
    assert submit_res.status_code == 200
    assert submit_res.json()["onboarding_completed"] is True
    assert submit_res.json()["baseline_mass"] > 0

    # List actions
    actions_res = client.get("/api/actions", headers=headers)
    assert actions_res.status_code == 200
    assert len(actions_res.json()) > 0
    action_id = actions_res.json()[0]["id"]

    # Start action
    start_res = client.post(f"/api/actions/{action_id}/start", headers=headers)
    assert start_res.status_code == 200
    assert start_res.json()["user_status"] == "active"

    # Complete action
    comp_res = client.post(f"/api/actions/{action_id}/complete", headers=headers)
    assert comp_res.status_code == 200
    assert comp_res.json()["new_mass"] < comp_res.json()["previous_mass"]

def test_leaderboard_and_progress():
    client.post(
        "/api/auth/register",
        json={"username": "user2", "email": "user2@example.com", "password": "password123"}
    )
    login_res = client.post(
        "/api/auth/login",
        json={"username": "user2", "password": "password123"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch leaderboard
    leaderboard_res = client.get("/api/leaderboard", headers=headers)
    assert leaderboard_res.status_code == 200
    assert "leaderboard" in leaderboard_res.json()

    # Fetch progress history
    progress_res = client.get("/api/progress/history", headers=headers)
    assert progress_res.status_code == 200
    assert "history" in progress_res.json()
