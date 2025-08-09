import pytest
from app.core.security import get_password_hash
from app.models.employee import Employee
from app.models.project import Project, ProjectMember, ProjectSkill
from app.models.client import Client
from app.models.skill import Skill
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


def create_test_skill(db, name, category):
    """Helper function to create a test skill"""
    db_skill = Skill(name=name, category=category)
    db.add(db_skill)
    db.commit()
    db.refresh(db_skill)
    return db_skill


def get_auth_token(client, email, password):
    """Helper function to get auth token"""
    response = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": password}
    )
    return response.json()["access_token"]


def test_get_projects_list(client, test_project_data, test_client_data, admin_user_data):
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create admin user
    create_test_user(db, admin_user_data)
    
    # Create test client
    db_client = create_test_client(db, test_client_data)
    
    # Create multiple projects
    for i in range(3):
        project = Project(
            name=f"Project {i}",
            client_id=db_client.id,
            description=f"Description {i}",
            status="planning" if i == 0 else "in_progress",
            team_size=5
        )
        db.add(project)
    db.commit()
    
    token = get_auth_token(client, admin_user_data["email"], admin_user_data["password"])
    
    # Get projects list
    response = client.get(
        "/api/v1/projects/",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    assert all("name" in project for project in data)
    assert all("status" in project for project in data)
    assert data[0]["client_name"] == test_client_data["name"]


def test_get_project_by_id(client, test_project_data, test_client_data, admin_user_data):
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create admin user
    admin = create_test_user(db, admin_user_data)
    
    # Create test client
    db_client = create_test_client(db, test_client_data)
    
    # Create project with skills
    skill1 = create_test_skill(db, "Python", "Backend")
    skill2 = create_test_skill(db, "FastAPI", "Backend")
    
    project = Project(
        name=test_project_data["name"],
        client_id=db_client.id,
        description=test_project_data["description"],
        status=test_project_data["status"],
        team_size=test_project_data["team_size"]
    )
    db.add(project)
    db.flush()
    
    # Add skills to project
    ps1 = ProjectSkill(project_id=project.id, skill_id=skill1.id, importance_level=5)
    ps2 = ProjectSkill(project_id=project.id, skill_id=skill2.id, importance_level=4)
    db.add(ps1)
    db.add(ps2)
    
    # Add member to project
    member = ProjectMember(
        project_id=project.id,
        employee_id=admin.id,
        role="project_manager",
        contribution_level=5
    )
    db.add(member)
    db.commit()
    
    token = get_auth_token(client, admin_user_data["email"], admin_user_data["password"])
    
    # Get project by ID
    response = client.get(
        f"/api/v1/projects/{project.id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == test_project_data["name"]
    assert data["client_name"] == test_client_data["name"]
    assert len(data["required_skills"]) == 2
    assert len(data["members"]) == 1
    assert data["members"][0]["employee_name"] == admin_user_data["name"]


def test_create_project(client, test_project_data, test_client_data, admin_user_data):
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create admin user
    create_test_user(db, admin_user_data)
    
    # Create test client
    db_client = create_test_client(db, test_client_data)
    
    # Create skills
    skill1 = create_test_skill(db, "Python", "Backend")
    skill2 = create_test_skill(db, "FastAPI", "Backend")
    
    token = get_auth_token(client, admin_user_data["email"], admin_user_data["password"])
    
    # Prepare project data
    project_data = {
        **test_project_data,
        "client_id": db_client.id,
        "skill_ids": [
            {"skill_id": skill1.id, "importance_level": 5},
            {"skill_id": skill2.id, "importance_level": 4}
        ]
    }
    
    # Create project
    response = client.post(
        "/api/v1/projects/",
        json=project_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == test_project_data["name"]
    assert data["client_name"] == test_client_data["name"]
    assert len(data["required_skills"]) == 2
    
    # Verify in database
    db_project = db.query(Project).filter(Project.name == test_project_data["name"]).first()
    assert db_project is not None
    assert db_project.client_id == db_client.id


def test_update_project(client, test_project_data, admin_user_data):
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create admin user
    create_test_user(db, admin_user_data)
    
    # Create project
    project = Project(
        name="Original Name",
        description="Original Description",
        status="planning"
    )
    db.add(project)
    db.commit()
    
    token = get_auth_token(client, admin_user_data["email"], admin_user_data["password"])
    
    # Update project
    update_data = {
        "name": "Updated Name",
        "description": "Updated Description",
        "status": "in_progress"
    }
    
    response = client.put(
        f"/api/v1/projects/{project.id}",
        json=update_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"
    assert data["description"] == "Updated Description"
    assert data["status"] == "in_progress"


def test_delete_project(client, admin_user_data):
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create admin user
    create_test_user(db, admin_user_data)
    
    # Create project
    project = Project(name="To Delete", status="planning")
    db.add(project)
    db.commit()
    project_id = project.id
    
    token = get_auth_token(client, admin_user_data["email"], admin_user_data["password"])
    
    # Delete project
    response = client.delete(
        f"/api/v1/projects/{project_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    
    # Verify deletion
    db_project = db.query(Project).filter(Project.id == project_id).first()
    assert db_project is None


def test_add_project_member(client, test_user_data, admin_user_data):
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create admin and regular user
    admin = create_test_user(db, admin_user_data)
    employee = create_test_user(db, test_user_data)
    
    # Create project
    project = Project(name="Test Project", status="planning")
    db.add(project)
    db.commit()
    
    token = get_auth_token(client, admin_user_data["email"], admin_user_data["password"])
    
    # Add member to project
    member_data = {
        "employee_id": employee.id,
        "role": "developer",
        "contribution_level": 3
    }
    
    response = client.post(
        f"/api/v1/projects/{project.id}/members",
        json=member_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["employee_id"] == employee.id
    assert data["role"] == "developer"
    assert data["employee_name"] == test_user_data["name"]


def test_update_project_member(client, test_user_data, admin_user_data):
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create users
    admin = create_test_user(db, admin_user_data)
    employee = create_test_user(db, test_user_data)
    
    # Create project with member
    project = Project(name="Test Project", status="planning")
    db.add(project)
    db.flush()
    
    member = ProjectMember(
        project_id=project.id,
        employee_id=employee.id,
        role="developer",
        contribution_level=3
    )
    db.add(member)
    db.commit()
    
    token = get_auth_token(client, admin_user_data["email"], admin_user_data["password"])
    
    # Update member
    update_data = {
        "role": "tech_lead",
        "contribution_level": 5
    }
    
    response = client.put(
        f"/api/v1/projects/{project.id}/members/{member.id}",
        json=update_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "tech_lead"
    assert data["contribution_level"] == 5


def test_remove_project_member(client, test_user_data, admin_user_data):
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create users
    admin = create_test_user(db, admin_user_data)
    employee = create_test_user(db, test_user_data)
    
    # Create project with member
    project = Project(name="Test Project", status="planning")
    db.add(project)
    db.flush()
    
    member = ProjectMember(
        project_id=project.id,
        employee_id=employee.id,
        role="developer"
    )
    db.add(member)
    db.commit()
    member_id = member.id
    
    token = get_auth_token(client, admin_user_data["email"], admin_user_data["password"])
    
    # Remove member
    response = client.delete(
        f"/api/v1/projects/{project.id}/members/{member_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    
    # Verify removal
    db_member = db.query(ProjectMember).filter(ProjectMember.id == member_id).first()
    assert db_member is None


def test_project_permission_denied_for_regular_user(client, test_user_data, test_project_data):
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create regular user
    create_test_user(db, test_user_data)
    
    token = get_auth_token(client, test_user_data["email"], test_user_data["password"])
    
    # Try to create project (should fail)
    response = client.post(
        "/api/v1/projects/",
        json=test_project_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 403
    assert "Not enough permissions" in response.json()["detail"]


def test_get_nonexistent_project(client, admin_user_data):
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    
    create_test_user(db, admin_user_data)
    token = get_auth_token(client, admin_user_data["email"], admin_user_data["password"])
    
    response = client.get(
        "/api/v1/projects/999999",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 404
    assert "Project not found" in response.json()["detail"]