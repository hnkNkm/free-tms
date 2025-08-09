from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
import enum

class Role(str, enum.Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    EMPLOYEE = "employee"

class Employee(Base):
    __tablename__ = "employees"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    department = Column(String(100))
    position = Column(String(100))
    joined_date = Column(DateTime(timezone=True))
    role = Column(Enum(Role), default=Role.EMPLOYEE)
    is_active = Column(Boolean, default=True)
    
    self_introduction = Column(Text)
    career_goals = Column(Text)
    specialties = Column(Text)
    preferred_project_types = Column(Text)  # JSON as text
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    project_memberships = relationship("ProjectMember", back_populates="employee")