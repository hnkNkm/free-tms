from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float, Date, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
import enum


class ProjectStatus(str, enum.Enum):
    DRAFT = "draft"
    RECRUITING = "recruiting"
    PLANNING = "planning"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ON_HOLD = "on_hold"
    CANCELLED = "cancelled"


class ProjectMemberRole(str, enum.Enum):
    PROJECT_MANAGER = "project_manager"
    TECH_LEAD = "tech_lead"
    DEVELOPER = "developer"
    DESIGNER = "designer"
    QA = "qa"
    ANALYST = "analyst"
    OTHER = "other"


class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"))
    start_date = Column(Date)
    end_date = Column(Date)
    description = Column(Text)
    technologies = Column(Text)  # コンマ区切りの技術スタック
    difficulty_level = Column(Float)
    team_size = Column(Integer)
    status = Column(String(50), default=ProjectStatus.PLANNING.value)
    budget = Column(String(100))  # 予算規模
    
    # 募集関連フィールド
    estimated_duration = Column(Integer)  # 予定期間（日数）
    priority = Column(Integer, default=3)  # 優先度 1-5
    recruitment_deadline = Column(Date)  # 募集締切
    required_proficiency_level = Column(Integer, default=3)  # 必要スキルレベル 1-5
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    client = relationship("Client", back_populates="projects")
    members = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")
    required_skills = relationship("Skill", secondary="project_skills", back_populates="projects")


class ProjectMember(Base):
    __tablename__ = "project_members"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    role = Column(String(50), default=ProjectMemberRole.DEVELOPER.value)
    contribution_level = Column(Integer, default=3)  # 1-5の貢献度
    start_date = Column(Date)
    end_date = Column(Date)
    notes = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    project = relationship("Project", back_populates="members")
    employee = relationship("Employee", back_populates="project_memberships")


class ProjectSkill(Base):
    __tablename__ = "project_skills"

    project_id = Column(Integer, ForeignKey("projects.id"), primary_key=True)
    skill_id = Column(Integer, ForeignKey("skills.id"), primary_key=True)
    importance_level = Column(Integer, default=3)  # 1-5の重要度
    required_proficiency_level = Column(Integer, default=3)  # 必要習熟度 1-5