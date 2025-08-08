import pytest
from app.core.security import get_password_hash
from app.models.employee import Employee

def test_login_success(client, test_user_data):
    # Create a test user first
    from app.db.database import get_db
    from sqlalchemy.orm import Session
    
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create user in database
    db_user = Employee(
        name=test_user_data["name"],
        email=test_user_data["email"],
        password_hash=get_password_hash(test_user_data["password"]),
        department=test_user_data["department"],
        position=test_user_data["position"],
        role=test_user_data["role"]
    )
    db.add(db_user)
    db.commit()
    
    # Test login
    response = client.post(
        "/api/v1/auth/login",
        data={
            "username": test_user_data["email"],
            "password": test_user_data["password"]
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_invalid_credentials(client):
    response = client.post(
        "/api/v1/auth/login",
        data={
            "username": "nonexistent@example.com",
            "password": "wrongpassword"
        }
    )
    
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"

def test_get_current_user(client, test_user_data):
    # Create and login user
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    
    db_user = Employee(
        name=test_user_data["name"],
        email=test_user_data["email"],
        password_hash=get_password_hash(test_user_data["password"]),
        department=test_user_data["department"],
        position=test_user_data["position"],
        role=test_user_data["role"]
    )
    db.add(db_user)
    db.commit()
    
    # Login to get token
    login_response = client.post(
        "/api/v1/auth/login",
        data={
            "username": test_user_data["email"],
            "password": test_user_data["password"]
        }
    )
    token = login_response.json()["access_token"]
    
    # Get current user info
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == test_user_data["email"]
    assert data["name"] == test_user_data["name"]
    assert data["role"] == test_user_data["role"]

def test_unauthorized_access(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalidtoken"}
    )
    assert response.status_code == 401