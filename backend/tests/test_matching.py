import pytest
from sqlalchemy.orm import Session
from datetime import date, datetime
from app.models import Employee, Project, Skill, ProjectStatus, EmployeeSkill
from app.models.project import ProjectSkill, ProjectMember
from app.services.matching_service import MatchingService


@pytest.fixture
def sample_data(db_session: Session):
    # Create skills
    python = Skill(name="Python", category="Programming")
    javascript = Skill(name="JavaScript", category="Programming")
    react = Skill(name="React", category="Framework")
    docker = Skill(name="Docker", category="DevOps")
    db_session.add_all([python, javascript, react, docker])
    db_session.flush()
    
    # Create employees with skills
    emp1 = Employee(
        name="Alice Developer",
        email="alice@example.com",
        password_hash="hash",
        department="Engineering",
        position="Senior Developer",
        role="employee",
        is_active=True
    )
    emp2 = Employee(
        name="Bob Frontend",
        email="bob@example.com",
        password_hash="hash",
        department="Engineering",
        position="Frontend Developer",
        role="employee",
        is_active=True
    )
    emp3 = Employee(
        name="Charlie DevOps",
        email="charlie@example.com",
        password_hash="hash",
        department="Engineering",
        position="DevOps Engineer",
        role="employee",
        is_active=True
    )
    db_session.add_all([emp1, emp2, emp3])
    db_session.flush()
    
    # Add skills to employees
    db_session.add_all([
        EmployeeSkill(employee_id=emp1.id, skill_id=python.id, proficiency_level=5, years_of_experience=5),
        EmployeeSkill(employee_id=emp1.id, skill_id=javascript.id, proficiency_level=4, years_of_experience=3),
        EmployeeSkill(employee_id=emp2.id, skill_id=javascript.id, proficiency_level=5, years_of_experience=4),
        EmployeeSkill(employee_id=emp2.id, skill_id=react.id, proficiency_level=5, years_of_experience=3),
        EmployeeSkill(employee_id=emp3.id, skill_id=docker.id, proficiency_level=5, years_of_experience=4),
        EmployeeSkill(employee_id=emp3.id, skill_id=python.id, proficiency_level=3, years_of_experience=2),
    ])
    
    # Create project
    project = Project(
        name="New Web Application",
        description="Modern web application development",
        status=ProjectStatus.RECRUITING,
        technologies="Python,React,Docker",
        team_size=5,
        priority=4,
        start_date=date.today(),
        estimated_duration=90
    )
    db_session.add(project)
    db_session.flush()
    
    # Add required skills to project
    db_session.add_all([
        ProjectSkill(project_id=project.id, skill_id=python.id, importance_level=5, required_proficiency_level=4),
        ProjectSkill(project_id=project.id, skill_id=react.id, importance_level=4, required_proficiency_level=3),
        ProjectSkill(project_id=project.id, skill_id=docker.id, importance_level=3, required_proficiency_level=3),
    ])
    
    db_session.commit()
    
    return {
        "project": project,
        "employees": [emp1, emp2, emp3],
        "skills": [python, javascript, react, docker]
    }


def test_calculate_skill_match_score(db_session: Session, sample_data):
    service = MatchingService(db_session)
    project = sample_data["project"]
    emp1 = sample_data["employees"][0]  # Alice - Python expert
    
    employee_skills = db_session.query(EmployeeSkill).filter(
        EmployeeSkill.employee_id == emp1.id
    ).all()
    project_skills = db_session.query(ProjectSkill).filter(
        ProjectSkill.project_id == project.id
    ).all()
    
    score = service.calculate_skill_match_score(employee_skills, project_skills)
    
    # Alice has Python(5) which is required at level 4, but only 1 of 3 required skills
    # So the score will be lower due to missing skills
    assert score > 10  # Has at least one matching skill
    assert score <= 100


def test_get_project_recommendations(db_session: Session, sample_data):
    service = MatchingService(db_session)
    project = sample_data["project"]
    
    recommendations = service.get_project_recommendations(
        project_id=project.id,
        limit=10,
        min_score=0
    )
    
    assert len(recommendations) == 3  # All 3 employees
    assert all("employee" in r for r in recommendations)
    assert all("scores" in r for r in recommendations)
    assert all("matched_skills" in r for r in recommendations)
    
    # Check that scores are sorted descending
    scores = [r["scores"]["total"] for r in recommendations]
    assert scores == sorted(scores, reverse=True)


def test_bulk_match_employees(db_session: Session, sample_data):
    service = MatchingService(db_session)
    project = sample_data["project"]
    
    result = service.bulk_match_employees(
        project_id=project.id,
        skill_weight=0.6,
        experience_weight=0.2,
        availability_weight=0.2
    )
    
    assert "project" in result
    assert "summary" in result
    assert "categorized_recommendations" in result
    assert "weights_used" in result
    
    # Check weights were normalized
    weights = result["weights_used"]
    assert abs(weights["skill"] + weights["experience"] + weights["availability"] - 1.0) < 0.01
    
    # Check categorization
    categories = result["categorized_recommendations"]
    assert all(cat in categories for cat in ["excellent", "good", "fair", "poor"])
    
    # Check summary counts
    summary = result["summary"]
    total = sum([
        summary["excellent_matches"],
        summary["good_matches"],
        summary["fair_matches"],
        summary["poor_matches"]
    ])
    assert total == summary["total_candidates"]


def test_availability_score_calculation(db_session: Session, sample_data):
    service = MatchingService(db_session)
    project = sample_data["project"]
    emp1 = sample_data["employees"][0]
    
    # Employee with no active projects should have high availability
    score = service.calculate_availability_score(emp1, [])
    assert score == 100.0
    
    # Add active project membership
    active_project = Project(
        name="Active Project",
        status=ProjectStatus.IN_PROGRESS
    )
    db_session.add(active_project)
    db_session.flush()
    
    member = ProjectMember(
        project_id=active_project.id,
        employee_id=emp1.id,
        role="developer"
    )
    member.project = active_project  # Set relationship for testing
    
    # Employee with one active project
    score = service.calculate_availability_score(emp1, [member])
    assert score == 50.0


def test_matching_with_no_skills(db_session: Session):
    service = MatchingService(db_session)
    
    # Create project without skills
    project = Project(
        name="No Skills Project",
        status=ProjectStatus.RECRUITING
    )
    db_session.add(project)
    db_session.commit()
    
    # Create employee
    emp = Employee(
        name="Test Employee",
        email="test@example.com",
        password_hash="hash",
        role="employee",
        is_active=True
    )
    db_session.add(emp)
    db_session.commit()
    
    recommendations = service.get_project_recommendations(
        project_id=project.id,
        limit=10,
        min_score=0
    )
    
    # Should still return results but with 0 skill score
    assert len(recommendations) > 0
    assert all(r["scores"]["skill_match"] == 0 for r in recommendations)