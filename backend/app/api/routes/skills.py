from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.db.database import get_db
from app.models.skill import Skill, EmployeeSkill
from app.models.employee import Employee, Role
from app.schemas.skill import (
    Skill as SkillSchema,
    SkillCreate,
    SkillUpdate,
    EmployeeSkill as EmployeeSkillSchema,
    EmployeeSkillCreate,
    EmployeeSkillUpdate,
    EmployeeSkillWithDetails,
    SkillCategoryStats
)
from app.api.routes.auth import get_current_user

router = APIRouter()


@router.get("/", response_model=List[SkillSchema])
def get_skills(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all skills with optional filtering."""
    query = db.query(Skill)
    
    if category:
        query = query.filter(Skill.category == category)
    
    if search:
        query = query.filter(
            or_(
                Skill.name.ilike(f"%{search}%"),
                Skill.category.ilike(f"%{search}%")
            )
        )
    
    skills = query.offset(skip).limit(limit).all()
    return skills


@router.get("/categories", response_model=List[str])
def get_skill_categories(db: Session = Depends(get_db)):
    """Get all unique skill categories."""
    categories = db.query(Skill.category).distinct().filter(Skill.category.isnot(None)).all()
    return [cat[0] for cat in categories]


@router.get("/categories/stats", response_model=List[SkillCategoryStats])
def get_skill_category_stats(db: Session = Depends(get_db)):
    """Get statistics for each skill category."""
    stats = db.query(
        Skill.category,
        func.count(Skill.id).label("count")
    ).group_by(Skill.category).all()
    
    result = []
    for stat in stats:
        result.append(SkillCategoryStats(
            category=stat[0] or "未分類",
            count=stat[1]
        ))
    
    return result


@router.get("/{skill_id}", response_model=SkillSchema)
def get_skill(skill_id: int, db: Session = Depends(get_db)):
    """Get a specific skill by ID."""
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found"
        )
    return skill


@router.post("/", response_model=SkillSchema, status_code=status.HTTP_201_CREATED)
def create_skill(
    skill: SkillCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user)
):
    """Create a new skill. Requires admin or manager role."""
    if current_user.role not in [Role.ADMIN, Role.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and managers can create skills"
        )
    
    # Check if skill with same name already exists
    existing_skill = db.query(Skill).filter(Skill.name == skill.name).first()
    if existing_skill:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Skill with this name already exists"
        )
    
    db_skill = Skill(**skill.model_dump())
    db.add(db_skill)
    db.commit()
    db.refresh(db_skill)
    return db_skill


@router.put("/{skill_id}", response_model=SkillSchema)
def update_skill(
    skill_id: int,
    skill_update: SkillUpdate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user)
):
    """Update a skill. Requires admin or manager role."""
    if current_user.role not in [Role.ADMIN, Role.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and managers can update skills"
        )
    
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found"
        )
    
    # Check if new name conflicts with existing skill
    if skill_update.name and skill_update.name != skill.name:
        existing_skill = db.query(Skill).filter(Skill.name == skill_update.name).first()
        if existing_skill:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Skill with this name already exists"
            )
    
    for field, value in skill_update.model_dump(exclude_unset=True).items():
        setattr(skill, field, value)
    
    db.commit()
    db.refresh(skill)
    return skill


@router.delete("/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_skill(
    skill_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user)
):
    """Delete a skill. Requires admin role."""
    if current_user.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete skills"
        )
    
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found"
        )
    
    # Check if skill is associated with any employees
    employee_skills = db.query(EmployeeSkill).filter(EmployeeSkill.skill_id == skill_id).first()
    if employee_skills:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete skill that is associated with employees"
        )
    
    db.delete(skill)
    db.commit()


# Employee Skill Association Endpoints

@router.post("/employees/{employee_id}/skills", response_model=EmployeeSkillSchema, status_code=status.HTTP_201_CREATED)
def add_employee_skill(
    employee_id: int,
    skill_data: EmployeeSkillCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user)
):
    """Add a skill to an employee. Users can add their own skills, managers and admins can add for anyone."""
    if current_user.id != employee_id and current_user.role not in [Role.ADMIN, Role.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only add skills to your own profile"
        )
    
    # Check if employee exists
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    # Check if skill exists
    skill = db.query(Skill).filter(Skill.id == skill_data.skill_id).first()
    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found"
        )
    
    # Check if employee already has this skill
    existing = db.query(EmployeeSkill).filter(
        EmployeeSkill.employee_id == employee_id,
        EmployeeSkill.skill_id == skill_data.skill_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee already has this skill"
        )
    
    employee_skill = EmployeeSkill(
        employee_id=employee_id,
        **skill_data.model_dump()
    )
    db.add(employee_skill)
    db.commit()
    db.refresh(employee_skill)
    
    # Load skill relationship
    employee_skill.skill = skill
    
    return employee_skill


@router.get("/employees/{employee_id}/skills", response_model=List[EmployeeSkillWithDetails])
def get_employee_skills(
    employee_id: int,
    db: Session = Depends(get_db)
):
    """Get all skills for an employee."""
    # Check if employee exists
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    skills = db.query(
        EmployeeSkill.id,
        EmployeeSkill.employee_id,
        EmployeeSkill.skill_id,
        Skill.name.label("skill_name"),
        Skill.category.label("skill_category"),
        EmployeeSkill.proficiency_level,
        EmployeeSkill.years_of_experience,
        EmployeeSkill.created_at,
        EmployeeSkill.updated_at
    ).join(
        Skill, EmployeeSkill.skill_id == Skill.id
    ).filter(
        EmployeeSkill.employee_id == employee_id
    ).all()
    
    result = []
    for skill in skills:
        result.append(EmployeeSkillWithDetails(
            id=skill.id,
            employee_id=skill.employee_id,
            skill_id=skill.skill_id,
            skill_name=skill.skill_name,
            skill_category=skill.skill_category,
            proficiency_level=skill.proficiency_level,
            years_of_experience=skill.years_of_experience,
            created_at=skill.created_at,
            updated_at=skill.updated_at
        ))
    
    return result


@router.put("/employees/{employee_id}/skills/{skill_id}", response_model=EmployeeSkillSchema)
def update_employee_skill(
    employee_id: int,
    skill_id: int,
    skill_update: EmployeeSkillUpdate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user)
):
    """Update an employee's skill proficiency and experience. Users can update their own skills."""
    if current_user.id != employee_id and current_user.role not in [Role.ADMIN, Role.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own skills"
        )
    
    employee_skill = db.query(EmployeeSkill).filter(
        EmployeeSkill.employee_id == employee_id,
        EmployeeSkill.skill_id == skill_id
    ).first()
    
    if not employee_skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee skill association not found"
        )
    
    for field, value in skill_update.model_dump(exclude_unset=True).items():
        setattr(employee_skill, field, value)
    
    db.commit()
    db.refresh(employee_skill)
    
    # Load skill relationship
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    employee_skill.skill = skill
    
    return employee_skill


@router.delete("/employees/{employee_id}/skills/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_employee_skill(
    employee_id: int,
    skill_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user)
):
    """Remove a skill from an employee. Users can remove their own skills."""
    if current_user.id != employee_id and current_user.role not in [Role.ADMIN, Role.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only remove your own skills"
        )
    
    employee_skill = db.query(EmployeeSkill).filter(
        EmployeeSkill.employee_id == employee_id,
        EmployeeSkill.skill_id == skill_id
    ).first()
    
    if not employee_skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee skill association not found"
        )
    
    db.delete(employee_skill)
    db.commit()


@router.get("/search/by-skill", response_model=List[dict])
def search_employees_by_skill(
    skill_ids: List[int] = Query(..., description="List of skill IDs to search for"),
    min_proficiency: Optional[float] = Query(None, ge=0, le=5),
    db: Session = Depends(get_db)
):
    """Search for employees by skill IDs with optional minimum proficiency."""
    query = db.query(
        Employee.id,
        Employee.name,
        Employee.email,
        Employee.department,
        Employee.position,
        func.count(EmployeeSkill.skill_id).label("matching_skills_count")
    ).join(
        EmployeeSkill, Employee.id == EmployeeSkill.employee_id
    ).filter(
        EmployeeSkill.skill_id.in_(skill_ids)
    )
    
    if min_proficiency is not None:
        query = query.filter(EmployeeSkill.proficiency_level >= min_proficiency)
    
    results = query.group_by(
        Employee.id,
        Employee.name,
        Employee.email,
        Employee.department,
        Employee.position
    ).order_by(
        func.count(EmployeeSkill.skill_id).desc()
    ).all()
    
    return [
        {
            "id": r.id,
            "name": r.name,
            "email": r.email,
            "department": r.department,
            "position": r.position,
            "matching_skills_count": r.matching_skills_count
        }
        for r in results
    ]