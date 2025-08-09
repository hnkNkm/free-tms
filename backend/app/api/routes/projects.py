from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.api import deps
from app.models import Project, ProjectMember, ProjectSkill, Client, Employee, Skill
from app.schemas.project import (
    Project as ProjectSchema,
    ProjectCreate,
    ProjectUpdate,
    ProjectList,
    ProjectMemberCreate,
    ProjectMemberUpdate,
    ProjectMemberInDB,
)
from app.api.routes.auth import get_current_user

router = APIRouter()


@router.get("/", response_model=List[ProjectList])
def get_projects(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    status: Optional[str] = None,
    client_id: Optional[int] = None,
    db: Session = Depends(deps.get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Get list of projects."""
    query = db.query(
        Project.id,
        Project.name,
        Project.status,
        Project.start_date,
        Project.end_date,
        Project.team_size,
        Client.name.label("client_name"),
        func.count(ProjectMember.id).label("member_count"),
    ).outerjoin(Client).outerjoin(ProjectMember).group_by(Project.id, Client.name)
    
    if status:
        query = query.filter(Project.status == status)
    if client_id:
        query = query.filter(Project.client_id == client_id)
    
    projects = query.offset(skip).limit(limit).all()
    
    return [ProjectList(**dict(p._mapping)) for p in projects]


@router.get("/{project_id}", response_model=ProjectSchema)
def get_project(
    project_id: int,
    db: Session = Depends(deps.get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Get project detail."""
    project = db.query(Project).options(
        joinedload(Project.client),
        joinedload(Project.members).joinedload(ProjectMember.employee),
        joinedload(Project.required_skills)
    ).filter(Project.id == project_id).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Format response
    project_dict = {
        "id": project.id,
        "name": project.name,
        "client_id": project.client_id,
        "client_name": project.client.name if project.client else None,
        "description": project.description,
        "start_date": project.start_date,
        "end_date": project.end_date,
        "technologies": project.technologies,
        "difficulty_level": project.difficulty_level,
        "team_size": project.team_size,
        "status": project.status,
        "budget": project.budget,
        "created_at": project.created_at,
        "updated_at": project.updated_at,
        "members": [],
        "required_skills": []
    }
    
    # Add members
    for member in project.members:
        member_dict = {
            "id": member.id,
            "project_id": member.project_id,
            "employee_id": member.employee_id,
            "employee_name": member.employee.name if member.employee else None,
            "role": member.role,
            "contribution_level": member.contribution_level,
            "start_date": member.start_date,
            "end_date": member.end_date,
            "notes": member.notes,
            "created_at": member.created_at,
            "updated_at": member.updated_at,
        }
        project_dict["members"].append(member_dict)
    
    # Add skills
    project_skills = db.query(ProjectSkill, Skill).join(Skill).filter(
        ProjectSkill.project_id == project_id
    ).all()
    
    for ps, skill in project_skills:
        project_dict["required_skills"].append({
            "id": skill.id,
            "name": skill.name,
            "category": skill.category,
            "importance_level": ps.importance_level
        })
    
    return ProjectSchema(**project_dict)


@router.post("/", response_model=ProjectSchema)
def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(deps.get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Create new project (admin/manager only)."""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Create project
    project_data = project_in.dict(exclude={"skill_ids"})
    project = Project(**project_data)
    db.add(project)
    db.flush()
    
    # Add skills
    if project_in.skill_ids:
        for skill_data in project_in.skill_ids:
            project_skill = ProjectSkill(
                project_id=project.id,
                skill_id=skill_data.skill_id,
                importance_level=skill_data.importance_level
            )
            db.add(project_skill)
    
    db.commit()
    db.refresh(project)
    
    return get_project(project.id, db, current_user)


@router.put("/{project_id}", response_model=ProjectSchema)
def update_project(
    project_id: int,
    project_in: ProjectUpdate,
    db: Session = Depends(deps.get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Update project (admin/manager only)."""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Update project fields
    update_data = project_in.dict(exclude_unset=True, exclude={"skill_ids"})
    for field, value in update_data.items():
        setattr(project, field, value)
    
    # Update skills if provided
    if project_in.skill_ids is not None:
        # Remove existing skills
        db.query(ProjectSkill).filter(ProjectSkill.project_id == project_id).delete()
        
        # Add new skills
        for skill_data in project_in.skill_ids:
            project_skill = ProjectSkill(
                project_id=project_id,
                skill_id=skill_data.skill_id,
                importance_level=skill_data.importance_level
            )
            db.add(project_skill)
    
    db.commit()
    db.refresh(project)
    
    return get_project(project_id, db, current_user)


@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    db: Session = Depends(deps.get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Delete project (admin only)."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db.delete(project)
    db.commit()
    
    return {"message": "Project deleted successfully"}


# Project Member endpoints
@router.post("/{project_id}/members", response_model=ProjectMemberInDB)
def add_project_member(
    project_id: int,
    member_in: ProjectMemberCreate,
    db: Session = Depends(deps.get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Add member to project (admin/manager only)."""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Check project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check employee exists
    employee = db.query(Employee).filter(Employee.id == member_in.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Check if already member
    existing = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.employee_id == member_in.employee_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Employee is already a member of this project")
    
    # Create member
    member = ProjectMember(project_id=project_id, **member_in.dict())
    db.add(member)
    db.commit()
    db.refresh(member)
    
    # Add employee name for response
    response = ProjectMemberInDB.from_orm(member)
    response.employee_name = employee.name
    
    return response


@router.put("/{project_id}/members/{member_id}", response_model=ProjectMemberInDB)
def update_project_member(
    project_id: int,
    member_id: int,
    member_in: ProjectMemberUpdate,
    db: Session = Depends(deps.get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Update project member (admin/manager only)."""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    member = db.query(ProjectMember).filter(
        ProjectMember.id == member_id,
        ProjectMember.project_id == project_id
    ).first()
    
    if not member:
        raise HTTPException(status_code=404, detail="Project member not found")
    
    # Update member fields
    update_data = member_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(member, field, value)
    
    db.commit()
    db.refresh(member)
    
    # Add employee name for response
    employee = db.query(Employee).filter(Employee.id == member.employee_id).first()
    response = ProjectMemberInDB.from_orm(member)
    response.employee_name = employee.name if employee else None
    
    return response


@router.delete("/{project_id}/members/{member_id}")
def remove_project_member(
    project_id: int,
    member_id: int,
    db: Session = Depends(deps.get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Remove member from project (admin/manager only)."""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    member = db.query(ProjectMember).filter(
        ProjectMember.id == member_id,
        ProjectMember.project_id == project_id
    ).first()
    
    if not member:
        raise HTTPException(status_code=404, detail="Project member not found")
    
    db.delete(member)
    db.commit()
    
    return {"message": "Member removed from project successfully"}