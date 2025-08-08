from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum
from sqlalchemy.sql import func
from app.db.database import Base
import enum

class JobStatus(str, enum.Enum):
    DRAFT = "draft"
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    CLOSED = "closed"

class ResponseStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"

class Job(Base):
    __tablename__ = "jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"))
    required_skills = Column(Text)  # JSON as text
    preferred_skills = Column(Text)  # JSON as text
    estimated_duration = Column(Integer)  # in days
    team_size_needed = Column(Integer)
    priority = Column(String(20))
    description = Column(Text)
    status = Column(Enum(JobStatus), default=JobStatus.DRAFT)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class JobInvitation(Base):
    __tablename__ = "job_invitations"
    
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"))
    employee_id = Column(Integer, ForeignKey("employees.id"))
    sent_at = Column(DateTime(timezone=True))
    opened_at = Column(DateTime(timezone=True))
    response_status = Column(Enum(ResponseStatus), default=ResponseStatus.PENDING)
    response_comment = Column(Text)
    sent_by = Column(Integer, ForeignKey("employees.id"))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())