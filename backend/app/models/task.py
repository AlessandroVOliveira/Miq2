"""SQLAlchemy models for Tasks and Calendar."""
import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import Column, String, Text, Integer, DateTime, Boolean, Date, Time, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class TaskStatus(str, PyEnum):
    """Task status options."""
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    BLOCKED = "blocked"
    CANCELLED = "cancelled"


class TaskPriority(str, PyEnum):
    """Task priority levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TaskRecurrence(str, PyEnum):
    """Task recurrence options."""
    NONE = "none"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class Task(Base):
    """Task for calendar/agenda."""
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(300), nullable=False, index=True)
    description = Column(Text, nullable=True)
    
    # Assignment
    assigned_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True)
    
    # Related entities
    related_implementation_id = Column(UUID(as_uuid=True), ForeignKey("implementations.id"), nullable=True)
    related_service_order_id = Column(UUID(as_uuid=True), ForeignKey("service_orders.id"), nullable=True)
    
    # Scheduling
    scheduled_date = Column(Date, nullable=True, index=True)
    scheduled_time = Column(Time, nullable=True)
    duration_minutes = Column(Integer, default=60)
    is_all_day = Column(Boolean, default=False)
    
    # Status
    status = Column(Enum(TaskStatus), default=TaskStatus.SCHEDULED)
    priority = Column(Enum(TaskPriority), default=TaskPriority.MEDIUM)
    recurrence = Column(Enum(TaskRecurrence), default=TaskRecurrence.NONE)
    
    # Completion
    completed_at = Column(DateTime, nullable=True)
    completed_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    assigned_user = relationship("User", foreign_keys=[assigned_user_id], backref="assigned_tasks")
    completed_by = relationship("User", foreign_keys=[completed_by_id])
    team = relationship("Team", backref="tasks")
    client = relationship("Client", backref="tasks")
    related_implementation = relationship("Implementation", backref="tasks")
    related_service_order = relationship("ServiceOrder", backref="tasks")
    diary_entries = relationship("TaskDiary", back_populates="task", cascade="all, delete-orphan")
    blockers = relationship("TaskBlocker", back_populates="task", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Task {self.title}>"


class TaskDiary(Base):
    """Diary entries for tasks."""
    __tablename__ = "task_diary"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    content = Column(Text, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    task = relationship("Task", back_populates="diary_entries")
    user = relationship("User", backref="task_diary_entries")

    def __repr__(self):
        return f"<TaskDiary {self.id}>"


class TaskBlocker(Base):
    """Blockers/impediments for tasks."""
    __tablename__ = "task_blockers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id"), nullable=False)
    
    reason = Column(Text, nullable=False)
    blocked_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    blocked_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    task = relationship("Task", back_populates="blockers")
    blocked_by = relationship("User", backref="created_blockers")

    @property
    def is_resolved(self):
        return self.resolved_at is not None

    def __repr__(self):
        return f"<TaskBlocker {self.id}>"
