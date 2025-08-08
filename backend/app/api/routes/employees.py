from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.employee import Employee as EmployeeModel
from app.schemas.employee import Employee, EmployeeCreate, EmployeeUpdate, EmployeeProfileUpdate
from app.core.security import get_password_hash
from app.api.routes.auth import get_current_user
import json

router = APIRouter()

@router.get("/", response_model=List[Employee])
def read_employees(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    employees = db.query(EmployeeModel).offset(skip).limit(limit).all()
    
    # Convert preferred_project_types from JSON string to list for each employee
    for employee in employees:
        if employee.preferred_project_types:
            try:
                employee.preferred_project_types = json.loads(employee.preferred_project_types)
            except:
                employee.preferred_project_types = []
        else:
            employee.preferred_project_types = []
    
    return employees

@router.post("/", response_model=Employee)
def create_employee(
    employee: EmployeeCreate,
    current_user: EmployeeModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only admin can create new employees
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create new employees"
        )
    
    db_employee = db.query(EmployeeModel).filter(EmployeeModel.email == employee.email).first()
    if db_employee:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(employee.password)
    db_employee = EmployeeModel(
        **employee.dict(exclude={"password"}),
        password_hash=hashed_password
    )
    db.add(db_employee)
    db.commit()
    db.refresh(db_employee)
    return db_employee

@router.get("/{employee_id}", response_model=Employee)
def read_employee(employee_id: int, db: Session = Depends(get_db)):
    employee = db.query(EmployeeModel).filter(EmployeeModel.id == employee_id).first()
    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Convert preferred_project_types from JSON string to list
    if employee.preferred_project_types:
        try:
            employee.preferred_project_types = json.loads(employee.preferred_project_types)
        except:
            employee.preferred_project_types = []
    else:
        employee.preferred_project_types = []
    
    return employee

@router.put("/{employee_id}/profile", response_model=Employee)
def update_employee_profile(
    employee_id: int,
    profile_update: EmployeeProfileUpdate,
    current_user: EmployeeModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if user can edit this profile (own profile or admin)
    if current_user.id != employee_id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own profile"
        )
    
    employee = db.query(EmployeeModel).filter(EmployeeModel.id == employee_id).first()
    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Update profile fields
    if profile_update.self_introduction is not None:
        employee.self_introduction = profile_update.self_introduction
    if profile_update.career_goals is not None:
        employee.career_goals = profile_update.career_goals
    if profile_update.specialties is not None:
        employee.specialties = profile_update.specialties
    if profile_update.preferred_project_types is not None:
        # Convert list to JSON string for storage
        employee.preferred_project_types = json.dumps(profile_update.preferred_project_types)
    
    db.commit()
    db.refresh(employee)
    
    # Convert back to list for response
    if employee.preferred_project_types:
        try:
            employee.preferred_project_types = json.loads(employee.preferred_project_types)
        except:
            employee.preferred_project_types = []
    else:
        employee.preferred_project_types = []
    
    return employee