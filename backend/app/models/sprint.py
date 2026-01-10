"""SQLAlchemy models for Sprint/Weekly Meetings."""
import uuid
from datetime import datetime, date
from enum import Enum as PyEnum

from sqlalchemy import Column, String, Text, DateTime, Boolean, Date, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class SprintStatus(str, PyEnum):
    """Sprint status options."""
    ACTIVE = "active"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class Sprint(Base):
    """Weekly sprint for team meetings."""
    __tablename__ = "sprints"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    
    # Sprint period (week)
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=False)
    
    # Optional team association
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True)
    
    # Status
    status = Column(Enum(SprintStatus), default=SprintStatus.ACTIVE)
    
    # Meeting notes
    meeting_notes = Column(Text, nullable=True)
    meeting_date = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    team = relationship("Team", backref="sprints")
    sprint_tasks = relationship("SprintTask", back_populates="sprint", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Sprint {self.title}>"


class SprintTask(Base):
    """Association between sprint and tasks."""
    __tablename__ = "sprint_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sprint_id = Column(UUID(as_uuid=True), ForeignKey("sprints.id"), nullable=False)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id"), nullable=False)
    
    # Was this task carried over from previous sprint?
    carried_over = Column(Boolean, default=False)
    
    # Sprint-specific notes for this task
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    sprint = relationship("Sprint", back_populates="sprint_tasks")
    task = relationship("Task", backref="sprint_associations")

    def __repr__(self):
        return f"<SprintTask sprint={self.sprint_id} task={self.task_id}>"
