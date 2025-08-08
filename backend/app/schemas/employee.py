from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from app.models.employee import Role

class EmployeeBase(BaseModel):
    name: str
    email: EmailStr
    department: Optional[str] = None
    position: Optional[str] = None
    joined_date: Optional[datetime] = None
    role: Role = Role.EMPLOYEE
    
class EmployeeCreate(EmployeeBase):
    password: str

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    role: Optional[Role] = None

class EmployeeProfileUpdate(BaseModel):
    self_introduction: Optional[str] = None
    career_goals: Optional[str] = None
    specialties: Optional[str] = None
    preferred_project_types: Optional[list[str]] = None

class Employee(EmployeeBase):
    id: int
    is_active: bool
    self_introduction: Optional[str] = None
    career_goals: Optional[str] = None
    specialties: Optional[str] = None
    preferred_project_types: Optional[list[str]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None