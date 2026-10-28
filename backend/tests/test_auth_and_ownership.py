import os

os.environ["DATABASE_URL"] = "sqlite:///./test_promptlab.db"
os.environ["SECRET_KEY"] = "test-secret-key"
os.environ["GEMINI_API_KEY"] = ""

from fastapi.testclient import TestClient

from app.database import Base, engine, init_db
from app.main import app


def setup_module() -> None:
    Base.metadata.drop_all(bind=engine)
    init_db()


client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_register_login_and_me() -> None:
    register = client.post(
        "/api/auth/register",
        json={"email": "anna@example.com", "password": "secret123", "display_name": "Anna"},
    )
    assert register.status_code == 201
    assert register.json()["email"] == "anna@example.com"

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["display_name"] == "Anna"

    client.post("/api/auth/logout")
    assert client.get("/api/auth/me").status_code == 401

    login = client.post(
        "/api/auth/login",
        json={"email": "anna@example.com", "password": "secret123"},
    )
    assert login.status_code == 200


def test_history_ownership() -> None:
    client.post("/api/auth/logout")
    a = client.post(
        "/api/auth/register",
        json={"email": "a@example.com", "password": "secret123", "display_name": "Alice"},
    )
    assert a.status_code == 201
    created = client.post(
        "/api/history",
        json={"original_prompt": "Napisz maila", "category": "Pisanie", "variants": []},
    )
    assert created.status_code == 201
    session_id = created.json()["id"]

    client.post("/api/auth/logout")
    client.post(
        "/api/auth/register",
        json={"email": "b@example.com", "password": "secret123", "display_name": "Bob"},
    )
    forbidden = client.get(f"/api/history/{session_id}")
    assert forbidden.status_code == 404
    deleted = client.delete(f"/api/history/{session_id}")
    assert deleted.status_code == 404


def test_examples_endpoint() -> None:
    response = client.get("/api/examples")
    assert response.status_code == 200
    assert len(response.json()) == 10


def test_analyze_without_gemini_key() -> None:
    response = client.post(
        "/api/prompts/analyze",
        json={"prompt": "Napisz plan marketingowy"},
    )
    assert response.status_code == 503
