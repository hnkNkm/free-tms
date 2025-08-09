from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Table
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.database import Base

# Association table for many-to-many relationship
employee_skills = Table(
    'employee_skills',
    Base.metadata,
    Column('employee_id', Integer, ForeignKey('employees.id'), primary_key=True),
    Column('skill_id', Integer, ForeignKey('skills.id'), primary_key=True),
    Column('proficiency_level', Float),
    Column('years_of_experience', Float)
)

class Skill(Base):
    __tablename__ = "skills"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    category = Column(String(50))
    description = Column(String(500))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    projects = relationship("Project", secondary="project_skills", back_populates="required_skills")

class EmployeeSkill(Base):
    __tablename__ = "employee_skills_detail"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    skill_id = Column(Integer, ForeignKey("skills.id"))
    proficiency_level = Column(Float)
    years_of_experience = Column(Float)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())