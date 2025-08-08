from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class SkillBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    category: Optional[str] = Field(None, max_length=50)


class SkillCreate(SkillBase):
    pass


class SkillUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    category: Optional[str] = Field(None, max_length=50)


class Skill(SkillBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class EmployeeSkillBase(BaseModel):
    skill_id: int
    proficiency_level: Optional[float] = Field(None, ge=0, le=5)
    years_of_experience: Optional[float] = Field(None, ge=0)


class EmployeeSkillCreate(EmployeeSkillBase):
    pass


class EmployeeSkillUpdate(BaseModel):
    proficiency_level: Optional[float] = Field(None, ge=0, le=5)
    years_of_experience: Optional[float] = Field(None, ge=0)


class EmployeeSkill(EmployeeSkillBase):
    id: int
    employee_id: int
    skill: Optional[Skill] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class EmployeeSkillWithDetails(BaseModel):
    id: int
    employee_id: int
    skill_id: int
    skill_name: str
    skill_category: Optional[str] = None
    proficiency_level: Optional[float] = None
    years_of_experience: Optional[float] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SkillCategoryStats(BaseModel):
    category: str
    count: int
    avg_proficiency: Optional[float] = None