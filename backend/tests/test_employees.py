import pytest
from app.core.security import get_password_hash
from app.models.employee import Employee
import json

def create_test_user(db, user_data):
    """Helper function to create a test user"""
    db_user = Employee(
        name=user_data["name"],
        email=user_data["email"],
        password_hash=get_password_hash(user_data["password"]),
        department=user_data.get("department"),
        position=user_data.get("position"),
        role=user_data.get("role", "employee")
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_auth_token(client, email, password):
    """Helper function to get auth token"""
    response = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": password}
    )
    return response.json()["access_token"]

def test_get_employees_list(client, test_user_data):
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create multiple test users
    users_data = [
        {**test_user_data, "email": f"user{i}@example.com", "name": f"User {i}"}
        for i in range(3)
    ]
    
    for user_data in users_data:
        create_test_user(db, user_data)
    
    # Create admin user for authentication
    admin_data = {
        "name": "Admin",
        "email": "admin@test.com",
        "password": "admin123",
        "role": "admin"
    }
    create_test_user(db, admin_data)
    
    token = get_auth_token(client, "admin@test.com", "admin123")
    
    # Get employees list
    response = client.get(
        "/api/v1/employees/",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 4  # 3 users + 1 admin
    assert all("email" in user for user in data)
    assert all("preferred_project_types" in user for user in data)

def test_get_employee_by_id(client, test_user_data):
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create test user
    db_user = create_test_user(db, test_user_data)
    
    # Create admin for auth
    admin_data = {
        "name": "Admin",
        "email": "admin@test.com",
        "password": "admin123",
        "role": "admin"
    }
    create_test_user(db, admin_data)
    
    token = get_auth_token(client, "admin@test.com", "admin123")
    
    # Get employee by ID
    response = client.get(
        f"/api/v1/employees/{db_user.id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == test_user_data["email"]
    assert data["name"] == test_user_data["name"]
    assert isinstance(data["preferred_project_types"], list)

def test_get_nonexistent_employee(client, admin_user_data):
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    create_test_user(db, admin_user_data)
    
    token = get_auth_token(client, admin_user_data["email"], admin_user_data["password"])
    
    response = client.get(
        "/api/v1/employees/99999",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 404
    assert response.json()["detail"] == "Employee not found"

def test_create_employee_as_admin(client):
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create admin user
    admin_data = {
        "name": "Admin",
        "email": "admin@test.com",
        "password": "admin123",
        "role": "admin"
    }
    create_test_user(db, admin_data)
    
    token = get_auth_token(client, "admin@test.com", "admin123")
    
    # Create new employee
    new_employee = {
        "name": "New Employee",
        "email": "newemployee@test.com",
        "password": "password123",
        "department": "開発部",
        "position": "エンジニア",
        "role": "employee"
    }
    
    response = client.post(
        "/api/v1/employees/",
        json=new_employee,
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == new_employee["email"]
    assert data["name"] == new_employee["name"]
    assert data["department"] == new_employee["department"]
    assert data["position"] == new_employee["position"]
    assert data["role"] == new_employee["role"]
    assert "password" not in data  # Password should not be returned
    assert "password_hash" not in data  # Password hash should not be returned

def test_create_employee_as_non_admin(client):
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create regular user
    user_data = {
        "name": "Regular User",
        "email": "user@test.com",
        "password": "user123",
        "role": "employee"
    }
    create_test_user(db, user_data)
    
    token = get_auth_token(client, "user@test.com", "user123")
    
    # Try to create new employee
    new_employee = {
        "name": "New Employee",
        "email": "newemployee@test.com",
        "password": "password123",
        "department": "開発部",
        "position": "エンジニア",
        "role": "employee"
    }
    
    response = client.post(
        "/api/v1/employees/",
        json=new_employee,
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 403
    assert "Only administrators" in response.json()["detail"]

def test_create_employee_duplicate_email(client):
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create admin user
    admin_data = {
        "name": "Admin",
        "email": "admin@test.com",
        "password": "admin123",
        "role": "admin"
    }
    create_test_user(db, admin_data)
    
    # Create existing user
    existing_user = {
        "name": "Existing User",
        "email": "existing@test.com",
        "password": "password123",
        "role": "employee"
    }
    create_test_user(db, existing_user)
    
    token = get_auth_token(client, "admin@test.com", "admin123")
    
    # Try to create employee with duplicate email
    new_employee = {
        "name": "New Employee",
        "email": "existing@test.com",  # Duplicate email
        "password": "password123",
        "department": "開発部",
        "position": "エンジニア",
        "role": "employee"
    }
    
    response = client.post(
        "/api/v1/employees/",
        json=new_employee,
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 400
    assert "Email already registered" in response.json()["detail"]

def test_create_employee_without_auth(client):
    # Try to create employee without authentication
    new_employee = {
        "name": "New Employee",
        "email": "newemployee@test.com",
        "password": "password123",
        "department": "開発部",
        "position": "エンジニア",
        "role": "employee"
    }
    
    response = client.post(
        "/api/v1/employees/",
        json=new_employee
    )
    
    assert response.status_code == 401
    assert "Not authenticated" in response.json()["detail"]

def test_update_own_profile(client, test_user_data):
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create test user
    db_user = create_test_user(db, test_user_data)
    token = get_auth_token(client, test_user_data["email"], test_user_data["password"])
    
    # Update profile
    update_data = {
        "self_introduction": "私はテストユーザーです",
        "career_goals": "テストを極めたい",
        "specialties": "自動テスト",
        "preferred_project_types": ["テスト自動化", "CI/CD"]
    }
    
    response = client.put(
        f"/api/v1/employees/{db_user.id}/profile",
        json=update_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["self_introduction"] == update_data["self_introduction"]
    assert data["career_goals"] == update_data["career_goals"]
    assert data["specialties"] == update_data["specialties"]
    assert data["preferred_project_types"] == update_data["preferred_project_types"]

def test_cannot_update_others_profile(client, test_user_data):
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create two users
    user1 = create_test_user(db, test_user_data)
    user2_data = {**test_user_data, "email": "user2@example.com", "name": "User 2"}
    user2 = create_test_user(db, user2_data)
    
    # Try to update user2's profile with user1's token
    token = get_auth_token(client, test_user_data["email"], test_user_data["password"])
    
    update_data = {
        "self_introduction": "Trying to update someone else's profile"
    }
    
    response = client.put(
        f"/api/v1/employees/{user2.id}/profile",
        json=update_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 403
    assert response.json()["detail"] == "You can only edit your own profile"

def test_admin_can_update_any_profile(client, test_user_data, admin_user_data):
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create regular user and admin
    regular_user = create_test_user(db, test_user_data)
    admin_user = create_test_user(db, admin_user_data)
    
    # Admin updates regular user's profile
    token = get_auth_token(client, admin_user_data["email"], admin_user_data["password"])
    
    update_data = {
        "self_introduction": "Updated by admin",
        "career_goals": "Admin set goals"
    }
    
    response = client.put(
        f"/api/v1/employees/{regular_user.id}/profile",
        json=update_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["self_introduction"] == update_data["self_introduction"]
    assert data["career_goals"] == update_data["career_goals"]

def test_preferred_project_types_json_handling(client, test_user_data):
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create user with preferred_project_types as JSON string
    db_user = Employee(
        name=test_user_data["name"],
        email=test_user_data["email"],
        password_hash=get_password_hash(test_user_data["password"]),
        department=test_user_data.get("department"),
        position=test_user_data.get("position"),
        role=test_user_data.get("role", "employee"),
        preferred_project_types=json.dumps(["AI開発", "Web開発"])
    )
    db.add(db_user)
    db.commit()
    
    token = get_auth_token(client, test_user_data["email"], test_user_data["password"])
    
    # Get employee - should return list, not string
    response = client.get(
        f"/api/v1/employees/{db_user.id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["preferred_project_types"], list)
    assert data["preferred_project_types"] == ["AI開発", "Web開発"]