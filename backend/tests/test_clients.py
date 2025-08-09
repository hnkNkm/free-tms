import pytest
from app.core.security import get_password_hash
from app.models.employee import Employee
from app.models.client import Client
from app.models.project import Project
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


def create_test_client(db, client_data):
    """Helper function to create a test client"""
    db_client = Client(**client_data)
    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    return db_client


def get_auth_token(client, email, password):
    """Helper function to get auth token"""
    response = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": password}
    )
    return response.json()["access_token"]


def test_get_clients_list(client, test_client_data, admin_user_data):
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create admin user
    create_test_user(db, admin_user_data)
    
    # Create multiple clients
    for i in range(3):
        client_data = {
            **test_client_data,
            "name": f"Client {i}",
            "industry": f"Industry {i}"
        }
        create_test_client(db, client_data)
    
    token = get_auth_token(client, admin_user_data["email"], admin_user_data["password"])
    
    # Get clients list
    response = client.get(
        "/api/v1/clients/",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    assert all("name" in c for c in data)
    assert all("industry" in c for c in data)
    assert all("project_count" in c for c in data)


def test_search_clients(client, test_client_data, admin_user_data):
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create admin user
    create_test_user(db, admin_user_data)
    
    # Create clients with different names
    create_test_client(db, {**test_client_data, "name": "ABC Corporation"})
    create_test_client(db, {**test_client_data, "name": "XYZ Company"})
    create_test_client(db, {**test_client_data, "name": "ABC Industries"})
    
    token = get_auth_token(client, admin_user_data["email"], admin_user_data["password"])
    
    # Search for "ABC"
    response = client.get(
        "/api/v1/clients/?search=ABC",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert all("ABC" in c["name"] for c in data)


def test_get_client_by_id(client, test_client_data, admin_user_data):
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create admin user
    create_test_user(db, admin_user_data)
    
    # Create client with project
    db_client = create_test_client(db, test_client_data)
    
    # Create a project for this client
    project = Project(
        name="Test Project",
        client_id=db_client.id,
        status="planning"
    )
    db.add(project)
    db.commit()
    
    token = get_auth_token(client, admin_user_data["email"], admin_user_data["password"])
    
    # Get client by ID
    response = client.get(
        f"/api/v1/clients/{db_client.id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == test_client_data["name"]
    assert data["industry"] == test_client_data["industry"]
    assert data["contact_person"] == test_client_data["contact_person"]
    assert data["project_count"] == 1


def test_create_client(client, test_client_data, admin_user_data):
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create admin user
    create_test_user(db, admin_user_data)
    
    token = get_auth_token(client, admin_user_data["email"], admin_user_data["password"])
    
    # Create client
    response = client.post(
        "/api/v1/clients/",
        json=test_client_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == test_client_data["name"]
    assert data["industry"] == test_client_data["industry"]
    assert data["contact_email"] == test_client_data["contact_email"]
    assert data["project_count"] == 0
    
    # Verify in database
    db_client = db.query(Client).filter(Client.name == test_client_data["name"]).first()
    assert db_client is not None
    assert db_client.contact_person == test_client_data["contact_person"]


def test_create_duplicate_client_name(client, test_client_data, admin_user_data):
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create admin user
    create_test_user(db, admin_user_data)
    
    # Create first client
    create_test_client(db, test_client_data)
    
    token = get_auth_token(client, admin_user_data["email"], admin_user_data["password"])
    
    # Try to create client with same name
    response = client.post(
        "/api/v1/clients/",
        json=test_client_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


def test_update_client(client, test_client_data, admin_user_data):
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create admin user
    create_test_user(db, admin_user_data)
    
    # Create client
    db_client = create_test_client(db, test_client_data)
    
    token = get_auth_token(client, admin_user_data["email"], admin_user_data["password"])
    
    # Update client
    update_data = {
        "name": "Updated Client Name",
        "industry": "Updated Industry",
        "contact_person": "Updated Person"
    }
    
    response = client.put(
        f"/api/v1/clients/{db_client.id}",
        json=update_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Client Name"
    assert data["industry"] == "Updated Industry"
    assert data["contact_person"] == "Updated Person"


def test_update_client_duplicate_name(client, test_client_data, admin_user_data):
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create admin user
    create_test_user(db, admin_user_data)
    
    # Create two clients
    client1 = create_test_client(db, {**test_client_data, "name": "Client 1"})
    client2 = create_test_client(db, {**test_client_data, "name": "Client 2"})
    
    token = get_auth_token(client, admin_user_data["email"], admin_user_data["password"])
    
    # Try to update client2 with client1's name
    update_data = {"name": "Client 1"}
    
    response = client.put(
        f"/api/v1/clients/{client2.id}",
        json=update_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


def test_delete_client(client, test_client_data, admin_user_data):
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create admin user
    create_test_user(db, admin_user_data)
    
    # Create client
    db_client = create_test_client(db, test_client_data)
    client_id = db_client.id
    
    token = get_auth_token(client, admin_user_data["email"], admin_user_data["password"])
    
    # Delete client
    response = client.delete(
        f"/api/v1/clients/{client_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    
    # Verify deletion
    db_client = db.query(Client).filter(Client.id == client_id).first()
    assert db_client is None


def test_delete_client_with_projects(client, test_client_data, admin_user_data):
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create admin user
    create_test_user(db, admin_user_data)
    
    # Create client with project
    db_client = create_test_client(db, test_client_data)
    
    # Create a project for this client
    project = Project(
        name="Test Project",
        client_id=db_client.id,
        status="planning"
    )
    db.add(project)
    db.commit()
    
    token = get_auth_token(client, admin_user_data["email"], admin_user_data["password"])
    
    # Try to delete client (should fail)
    response = client.delete(
        f"/api/v1/clients/{db_client.id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 400
    assert "Cannot delete client" in response.json()["detail"]
    assert "associated projects" in response.json()["detail"]


def test_client_permission_denied_for_regular_user(client, test_user_data, test_client_data):
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create regular user
    create_test_user(db, test_user_data)
    
    token = get_auth_token(client, test_user_data["email"], test_user_data["password"])
    
    # Try to create client (should fail)
    response = client.post(
        "/api/v1/clients/",
        json=test_client_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 403
    assert "Not enough permissions" in response.json()["detail"]


def test_client_permission_for_manager(client, test_client_data, admin_user_data):
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create manager user
    manager_data = {
        **admin_user_data,
        "email": "manager@example.com",
        "role": "manager"
    }
    create_test_user(db, manager_data)
    
    token = get_auth_token(client, "manager@example.com", admin_user_data["password"])
    
    # Manager should be able to create client
    response = client.post(
        "/api/v1/clients/",
        json=test_client_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == test_client_data["name"]


def test_get_nonexistent_client(client, admin_user_data):
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    
    create_test_user(db, admin_user_data)
    token = get_auth_token(client, admin_user_data["email"], admin_user_data["password"])
    
    response = client.get(
        "/api/v1/clients/999999",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 404
    assert "Client not found" in response.json()["detail"]