from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel, Field


class ProjectSkillBase(BaseModel):
    skill_id: int
    importance_level: int = Field(default=3, ge=1, le=5)


class ProjectMemberBase(BaseModel):
    employee_id: int
    role: str = "developer"
    contribution_level: int = Field(default=3, ge=1, le=5)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    notes: Optional[str] = None


class ProjectMemberCreate(ProjectMemberBase):
    pass


class ProjectMemberUpdate(BaseModel):
    role: Optional[str] = None
    contribution_level: Optional[int] = Field(None, ge=1, le=5)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    notes: Optional[str] = None


class ProjectMemberInDB(ProjectMemberBase):
    id: int
    project_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    employee_name: Optional[str] = None  # For response

    class Config:
        from_attributes = True


class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    client_id: Optional[int] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    technologies: Optional[str] = None
    difficulty_level: Optional[float] = Field(None, ge=1, le=5)
    team_size: Optional[int] = Field(None, ge=1)
    status: str = "planning"
    budget: Optional[str] = None


class ProjectCreate(ProjectBase):
    skill_ids: Optional[List[ProjectSkillBase]] = []


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    client_id: Optional[int] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    technologies: Optional[str] = None
    difficulty_level: Optional[float] = Field(None, ge=1, le=5)
    team_size: Optional[int] = Field(None, ge=1)
    status: Optional[str] = None
    budget: Optional[str] = None
    skill_ids: Optional[List[ProjectSkillBase]] = None


class ProjectInDBBase(ProjectBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Project(ProjectInDBBase):
    client_name: Optional[str] = None  # For response
    members: List[ProjectMemberInDB] = []
    required_skills: List[dict] = []  # skill info with importance_level


class ProjectList(BaseModel):
    id: int
    name: str
    client_name: Optional[str] = None
    status: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    team_size: Optional[int] = None
    member_count: int = 0

    class Config:
        from_attributes = True