from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base

class Client(Base):
    __tablename__ = "clients"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, unique=True)
    industry = Column(String(100))
    contact_person = Column(String(100))
    contact_email = Column(String(100))
    contact_phone = Column(String(50))
    address = Column(Text)
    website = Column(String(200))
    notes = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    projects = relationship("Project", back_populates="client")