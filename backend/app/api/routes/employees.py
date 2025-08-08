from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.employee import Employee as EmployeeModel
from app.schemas.employee import Employee, EmployeeCreate, EmployeeUpdate
from app.core.security import get_password_hash

router = APIRouter()

@router.get("/", response_model=List[Employee])
def read_employees(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    employees = db.query(EmployeeModel).offset(skip).limit(limit).all()
    return employees

@router.post("/", response_model=Employee)
def create_employee(
    employee: EmployeeCreate,
    db: Session = Depends(get_db)
):
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
    return employee