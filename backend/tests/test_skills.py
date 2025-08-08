import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.skill import Skill as SkillModel
from app.models.employee import Employee, Role
from app.core.security import get_password_hash
from tests.conftest import client, test_user_data, admin_user_data


def create_test_user(db: Session, user_data: dict):
    """Helper function to create a test user."""
    user = Employee(
        name=user_data["name"],
        email=user_data["email"],
        password_hash=get_password_hash(user_data["password"]),
        department=user_data.get("department"),
        position=user_data.get("position"),
        role=Role[user_data.get("role", "EMPLOYEE").upper()],
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_auth_token(client: TestClient, email: str, password: str):
    """Helper function to get authentication token."""
    response = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": password}
    )
    return response.json()["access_token"]


def test_get_skills_no_auth(client: TestClient):
    """Test getting skills without authentication."""
    response = client.get("/api/v1/skills/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_get_skills_with_limit(client: TestClient):
    """Test getting skills with limit parameter."""
    response = client.get("/api/v1/skills/?limit=5")
    assert response.status_code == 200
    skills = response.json()
    assert isinstance(skills, list)
    assert len(skills) <= 5


def test_get_skills_with_search(client: TestClient):
    """Test searching skills."""
    # First create a skill
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    skill = SkillModel(name="TestPython", category="Test")
    db.add(skill)
    db.commit()
    
    response = client.get("/api/v1/skills/?search=TestPython")
    assert response.status_code == 200
    skills = response.json()
    assert len(skills) >= 1
    assert any(s["name"] == "TestPython" for s in skills)
    
    # Clean up
    db.delete(skill)
    db.commit()
    db.close()


def test_get_skills_by_category(client: TestClient):
    """Test filtering skills by category."""
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    skill = SkillModel(name="TestSkill", category="TestCategory")
    db.add(skill)
    db.commit()
    
    response = client.get("/api/v1/skills/?category=TestCategory")
    assert response.status_code == 200
    skills = response.json()
    assert all(s["category"] == "TestCategory" for s in skills)
    
    # Clean up
    db.delete(skill)
    db.commit()
    db.close()


def test_get_skill_categories(client: TestClient):
    """Test getting skill categories."""
    response = client.get("/api/v1/skills/categories")
    assert response.status_code == 200
    categories = response.json()
    assert isinstance(categories, list)


def test_get_skill_category_stats(client: TestClient):
    """Test getting skill category statistics."""
    response = client.get("/api/v1/skills/categories/stats")
    assert response.status_code == 200
    stats = response.json()
    assert isinstance(stats, list)
    if stats:
        assert "category" in stats[0]
        assert "count" in stats[0]


def test_get_specific_skill(client: TestClient):
    """Test getting a specific skill by ID."""
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    skill = SkillModel(name="SpecificSkill", category="Test")
    db.add(skill)
    db.commit()
    db.refresh(skill)
    
    response = client.get(f"/api/v1/skills/{skill.id}")
    assert response.status_code == 200
    skill_data = response.json()
    assert skill_data["name"] == "SpecificSkill"
    assert skill_data["category"] == "Test"
    
    # Clean up
    db.delete(skill)
    db.commit()
    db.close()


def test_get_nonexistent_skill(client: TestClient):
    """Test getting a non-existent skill."""
    response = client.get("/api/v1/skills/99999")
    assert response.status_code == 404


def test_create_skill_as_admin(client: TestClient):
    """Test creating a skill as admin."""
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create admin user
    admin_data = {
        "name": "Admin",
        "email": "admin@skills.test",
        "password": "adminpass",
        "role": "admin"
    }
    admin_user = create_test_user(db, admin_data)
    token = get_auth_token(client, admin_data["email"], admin_data["password"])
    
    # Create skill
    skill_data = {
        "name": "NewTestSkill",
        "category": "NewCategory"
    }
    response = client.post(
        "/api/v1/skills/",
        json=skill_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 201
    created_skill = response.json()
    assert created_skill["name"] == "NewTestSkill"
    assert created_skill["category"] == "NewCategory"
    
    # Clean up
    skill = db.query(SkillModel).filter(SkillModel.id == created_skill["id"]).first()
    if skill:
        db.delete(skill)
    db.delete(admin_user)
    db.commit()
    db.close()


def test_create_skill_as_manager(client: TestClient):
    """Test creating a skill as manager."""
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create manager user
    manager_data = {
        "name": "Manager",
        "email": "manager@skills.test",
        "password": "managerpass",
        "role": "manager"
    }
    manager_user = create_test_user(db, manager_data)
    token = get_auth_token(client, manager_data["email"], manager_data["password"])
    
    # Create skill
    skill_data = {
        "name": "ManagerSkill",
        "category": "ManagerCategory"
    }
    response = client.post(
        "/api/v1/skills/",
        json=skill_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 201
    
    # Clean up
    skill = db.query(SkillModel).filter(SkillModel.name == "ManagerSkill").first()
    if skill:
        db.delete(skill)
    db.delete(manager_user)
    db.commit()
    db.close()


def test_create_skill_as_employee_forbidden(client: TestClient):
    """Test that regular employees cannot create skills."""
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create regular employee
    employee_data = {
        "name": "Employee",
        "email": "employee@skills.test",
        "password": "employeepass",
        "role": "employee"
    }
    employee_user = create_test_user(db, employee_data)
    token = get_auth_token(client, employee_data["email"], employee_data["password"])
    
    # Try to create skill
    skill_data = {
        "name": "EmployeeSkill",
        "category": "EmployeeCategory"
    }
    response = client.post(
        "/api/v1/skills/",
        json=skill_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403
    
    # Clean up
    db.delete(employee_user)
    db.commit()
    db.close()


def test_create_duplicate_skill(client: TestClient):
    """Test that duplicate skill names are not allowed."""
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create admin user
    admin_data = {
        "name": "Admin",
        "email": "admin2@skills.test",
        "password": "adminpass",
        "role": "admin"
    }
    admin_user = create_test_user(db, admin_data)
    token = get_auth_token(client, admin_data["email"], admin_data["password"])
    
    # Create first skill
    skill = SkillModel(name="DuplicateSkill", category="Test")
    db.add(skill)
    db.commit()
    
    # Try to create duplicate
    skill_data = {
        "name": "DuplicateSkill",
        "category": "AnotherCategory"
    }
    response = client.post(
        "/api/v1/skills/",
        json=skill_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]
    
    # Clean up
    db.delete(skill)
    db.delete(admin_user)
    db.commit()
    db.close()


def test_update_skill_as_admin(client: TestClient):
    """Test updating a skill as admin."""
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create admin user and skill
    admin_data = {
        "name": "Admin",
        "email": "admin3@skills.test",
        "password": "adminpass",
        "role": "admin"
    }
    admin_user = create_test_user(db, admin_data)
    token = get_auth_token(client, admin_data["email"], admin_data["password"])
    
    skill = SkillModel(name="UpdateSkill", category="OldCategory")
    db.add(skill)
    db.commit()
    db.refresh(skill)
    
    # Update skill
    update_data = {
        "name": "UpdatedSkill",
        "category": "NewCategory"
    }
    response = client.put(
        f"/api/v1/skills/{skill.id}",
        json=update_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    updated_skill = response.json()
    assert updated_skill["name"] == "UpdatedSkill"
    assert updated_skill["category"] == "NewCategory"
    
    # Clean up
    db.delete(skill)
    db.delete(admin_user)
    db.commit()
    db.close()


def test_delete_skill_as_admin(client: TestClient):
    """Test deleting a skill as admin."""
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create admin user and skill
    admin_data = {
        "name": "Admin",
        "email": "admin4@skills.test",
        "password": "adminpass",
        "role": "admin"
    }
    admin_user = create_test_user(db, admin_data)
    token = get_auth_token(client, admin_data["email"], admin_data["password"])
    
    skill = SkillModel(name="DeleteSkill", category="Test")
    db.add(skill)
    db.commit()
    db.refresh(skill)
    skill_id = skill.id
    
    # Delete skill
    response = client.delete(
        f"/api/v1/skills/{skill_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 204
    
    # Verify deletion
    deleted_skill = db.query(SkillModel).filter(SkillModel.id == skill_id).first()
    assert deleted_skill is None
    
    # Clean up
    db.delete(admin_user)
    db.commit()
    db.close()


def test_delete_skill_as_manager_forbidden(client: TestClient):
    """Test that managers cannot delete skills."""
    from app.db.database import get_db
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create manager user and skill
    manager_data = {
        "name": "Manager",
        "email": "manager2@skills.test",
        "password": "managerpass",
        "role": "manager"
    }
    manager_user = create_test_user(db, manager_data)
    token = get_auth_token(client, manager_data["email"], manager_data["password"])
    
    skill = SkillModel(name="ManagerDeleteSkill", category="Test")
    db.add(skill)
    db.commit()
    db.refresh(skill)
    
    # Try to delete skill
    response = client.delete(
        f"/api/v1/skills/{skill.id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403
    
    # Clean up
    db.delete(skill)
    db.delete(manager_user)
    db.commit()
    db.close()


def test_add_skill_to_employee(client: TestClient):
    """Test adding a skill to an employee."""
    from app.db.database import get_db
    from app.models.skill import EmployeeSkill
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create employee and skill
    employee_data = {
        "name": "Employee",
        "email": "employee2@skills.test",
        "password": "employeepass",
        "role": "employee"
    }
    employee_user = create_test_user(db, employee_data)
    token = get_auth_token(client, employee_data["email"], employee_data["password"])
    
    skill = SkillModel(name="EmployeeTestSkill", category="Test")
    db.add(skill)
    db.commit()
    db.refresh(skill)
    
    # Add skill to employee
    skill_data = {
        "skill_id": skill.id,
        "proficiency_level": 4.0,
        "years_of_experience": 3.5
    }
    response = client.post(
        f"/api/v1/skills/employees/{employee_user.id}/skills",
        json=skill_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 201
    employee_skill = response.json()
    assert employee_skill["skill_id"] == skill.id
    assert employee_skill["proficiency_level"] == 4.0
    assert employee_skill["years_of_experience"] == 3.5
    
    # Clean up
    emp_skill = db.query(EmployeeSkill).filter(
        EmployeeSkill.employee_id == employee_user.id,
        EmployeeSkill.skill_id == skill.id
    ).first()
    if emp_skill:
        db.delete(emp_skill)
    db.delete(skill)
    db.delete(employee_user)
    db.commit()
    db.close()


def test_get_employee_skills(client: TestClient):
    """Test getting all skills for an employee."""
    from app.db.database import get_db
    from app.models.skill import EmployeeSkill
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create employee and skills
    employee_data = {
        "name": "Employee",
        "email": "employee3@skills.test",
        "password": "employeepass",
        "role": "employee"
    }
    employee_user = create_test_user(db, employee_data)
    
    skill1 = SkillModel(name="Skill1", category="Cat1")
    skill2 = SkillModel(name="Skill2", category="Cat2")
    db.add(skill1)
    db.add(skill2)
    db.commit()
    db.refresh(skill1)
    db.refresh(skill2)
    
    # Add skills to employee
    emp_skill1 = EmployeeSkill(
        employee_id=employee_user.id,
        skill_id=skill1.id,
        proficiency_level=3.0,
        years_of_experience=2.0
    )
    emp_skill2 = EmployeeSkill(
        employee_id=employee_user.id,
        skill_id=skill2.id,
        proficiency_level=4.0,
        years_of_experience=3.0
    )
    db.add(emp_skill1)
    db.add(emp_skill2)
    db.commit()
    
    # Get employee skills
    response = client.get(f"/api/v1/skills/employees/{employee_user.id}/skills")
    assert response.status_code == 200
    skills = response.json()
    assert len(skills) == 2
    assert all("skill_name" in s for s in skills)
    assert all("proficiency_level" in s for s in skills)
    
    # Clean up
    db.delete(emp_skill1)
    db.delete(emp_skill2)
    db.delete(skill1)
    db.delete(skill2)
    db.delete(employee_user)
    db.commit()
    db.close()


def test_update_employee_skill(client: TestClient):
    """Test updating an employee's skill proficiency."""
    from app.db.database import get_db
    from app.models.skill import EmployeeSkill
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create employee and skill
    employee_data = {
        "name": "Employee",
        "email": "employee4@skills.test",
        "password": "employeepass",
        "role": "employee"
    }
    employee_user = create_test_user(db, employee_data)
    token = get_auth_token(client, employee_data["email"], employee_data["password"])
    
    skill = SkillModel(name="UpdateableSkill", category="Test")
    db.add(skill)
    db.commit()
    db.refresh(skill)
    
    # Add skill to employee
    emp_skill = EmployeeSkill(
        employee_id=employee_user.id,
        skill_id=skill.id,
        proficiency_level=2.0,
        years_of_experience=1.0
    )
    db.add(emp_skill)
    db.commit()
    
    # Update skill
    update_data = {
        "proficiency_level": 4.5,
        "years_of_experience": 3.0
    }
    response = client.put(
        f"/api/v1/skills/employees/{employee_user.id}/skills/{skill.id}",
        json=update_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    updated_skill = response.json()
    assert updated_skill["proficiency_level"] == 4.5
    assert updated_skill["years_of_experience"] == 3.0
    
    # Clean up
    db.delete(emp_skill)
    db.delete(skill)
    db.delete(employee_user)
    db.commit()
    db.close()


def test_remove_employee_skill(client: TestClient):
    """Test removing a skill from an employee."""
    from app.db.database import get_db
    from app.models.skill import EmployeeSkill
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create employee and skill
    employee_data = {
        "name": "Employee",
        "email": "employee5@skills.test",
        "password": "employeepass",
        "role": "employee"
    }
    employee_user = create_test_user(db, employee_data)
    token = get_auth_token(client, employee_data["email"], employee_data["password"])
    
    skill = SkillModel(name="RemovableSkill", category="Test")
    db.add(skill)
    db.commit()
    db.refresh(skill)
    
    # Add skill to employee
    emp_skill = EmployeeSkill(
        employee_id=employee_user.id,
        skill_id=skill.id,
        proficiency_level=3.0,
        years_of_experience=2.0
    )
    db.add(emp_skill)
    db.commit()
    
    # Remove skill
    response = client.delete(
        f"/api/v1/skills/employees/{employee_user.id}/skills/{skill.id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 204
    
    # Verify removal
    removed_skill = db.query(EmployeeSkill).filter(
        EmployeeSkill.employee_id == employee_user.id,
        EmployeeSkill.skill_id == skill.id
    ).first()
    assert removed_skill is None
    
    # Clean up
    db.delete(skill)
    db.delete(employee_user)
    db.commit()
    db.close()


def test_search_employees_by_skill(client: TestClient):
    """Test searching for employees by skill."""
    from app.db.database import get_db
    from app.models.skill import EmployeeSkill
    db = next(client.app.dependency_overrides[get_db]())
    
    # Create employees and skills
    emp1_data = {
        "name": "Employee1",
        "email": "emp1@search.test",
        "password": "pass",
        "role": "employee"
    }
    emp2_data = {
        "name": "Employee2",
        "email": "emp2@search.test",
        "password": "pass",
        "role": "employee"
    }
    emp1 = create_test_user(db, emp1_data)
    emp2 = create_test_user(db, emp2_data)
    
    skill1 = SkillModel(name="SearchSkill1", category="Test")
    skill2 = SkillModel(name="SearchSkill2", category="Test")
    db.add(skill1)
    db.add(skill2)
    db.commit()
    db.refresh(skill1)
    db.refresh(skill2)
    
    # Add skills to employees
    emp1_skill1 = EmployeeSkill(
        employee_id=emp1.id,
        skill_id=skill1.id,
        proficiency_level=4.0
    )
    emp1_skill2 = EmployeeSkill(
        employee_id=emp1.id,
        skill_id=skill2.id,
        proficiency_level=3.0
    )
    emp2_skill1 = EmployeeSkill(
        employee_id=emp2.id,
        skill_id=skill1.id,
        proficiency_level=2.0
    )
    db.add(emp1_skill1)
    db.add(emp1_skill2)
    db.add(emp2_skill1)
    db.commit()
    
    # Search by skills
    response = client.get(
        f"/api/v1/skills/search/by-skill?skill_ids={skill1.id}&skill_ids={skill2.id}&min_proficiency=3.0"
    )
    assert response.status_code == 200
    results = response.json()
    assert len(results) == 1
    assert results[0]["id"] == emp1.id
    assert results[0]["matching_skills_count"] == 2
    
    # Clean up
    db.delete(emp1_skill1)
    db.delete(emp1_skill2)
    db.delete(emp2_skill1)
    db.delete(skill1)
    db.delete(skill2)
    db.delete(emp1)
    db.delete(emp2)
    db.commit()
    db.close()