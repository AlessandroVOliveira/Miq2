"""Pydantic schemas for Tasks and Calendar."""
from datetime import datetime, date, time
from typing import Optional, List
from uuid import UUID
from enum import Enum
from pydantic import BaseModel, Field


class TaskStatusEnum(str, Enum):
    """Task status options."""
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    BLOCKED = "blocked"
    CANCELLED = "cancelled"


class TaskPriorityEnum(str, Enum):
    """Task priority levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TaskRecurrenceEnum(str, Enum):
    """Task recurrence options."""
    NONE = "none"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


# Basic schemas for nested responses
class ClientBasic(BaseModel):
    id: UUID
    company_name: str

    class Config:
        from_attributes = True


class UserBasic(BaseModel):
    id: UUID
    name: str

    class Config:
        from_attributes = True


class TeamBasic(BaseModel):
    id: UUID
    name: str

    class Config:
        from_attributes = True


# Task Diary schemas
class TaskDiaryCreate(BaseModel):
    """Create diary entry schema."""
    content: str = Field(..., min_length=1)


class TaskDiaryResponse(BaseModel):
    """Diary entry response schema."""
    id: UUID
    task_id: UUID
    user: UserBasic
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


# Task Blocker schemas
class TaskBlockerCreate(BaseModel):
    """Create blocker schema."""
    reason: str = Field(..., min_length=1)


class TaskBlockerResolve(BaseModel):
    """Resolve blocker schema."""
    resolution_notes: Optional[str] = None


class TaskBlockerResponse(BaseModel):
    """Blocker response schema."""
    id: UUID
    task_id: UUID
    reason: str
    blocked_by: UserBasic
    blocked_at: datetime
    resolved_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None

    class Config:
        from_attributes = True


# Task schemas
class TaskBase(BaseModel):
    """Base task schema."""
    title: str = Field(..., min_length=1, max_length=300)
    description: Optional[str] = None
    scheduled_date: Optional[date] = None
    scheduled_time: Optional[time] = None
    duration_minutes: int = 60
    is_all_day: bool = False
    priority: TaskPriorityEnum = TaskPriorityEnum.MEDIUM
    recurrence: TaskRecurrenceEnum = TaskRecurrenceEnum.NONE


class TaskCreate(TaskBase):
    """Create task schema."""
    assigned_user_id: UUID  # Required - every task must have an owner
    team_id: Optional[UUID] = None
    client_id: Optional[UUID] = None
    related_implementation_id: Optional[UUID] = None
    related_service_order_id: Optional[UUID] = None


class TaskUpdate(BaseModel):
    """Update task schema."""
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    description: Optional[str] = None
    assigned_user_id: Optional[UUID] = None
    team_id: Optional[UUID] = None
    client_id: Optional[UUID] = None
    scheduled_date: Optional[date] = None
    scheduled_time: Optional[time] = None
    duration_minutes: Optional[int] = None
    is_all_day: Optional[bool] = None
    status: Optional[TaskStatusEnum] = None
    priority: Optional[TaskPriorityEnum] = None
    recurrence: Optional[TaskRecurrenceEnum] = None


class TaskResponse(TaskBase):
    """Task response schema."""
    id: UUID
    assigned_user: Optional[UserBasic] = None
    team: Optional[TeamBasic] = None
    client: Optional[ClientBasic] = None
    related_implementation_id: Optional[UUID] = None
    related_service_order_id: Optional[UUID] = None
    status: TaskStatusEnum
    completed_at: Optional[datetime] = None
    completed_by: Optional[UserBasic] = None
    diary_entries: List[TaskDiaryResponse] = []
    blockers: List[TaskBlockerResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TaskListItem(BaseModel):
    """Task list item schema."""
    id: UUID
    title: str
    assigned_user: Optional[UserBasic] = None
    client: Optional[ClientBasic] = None
    scheduled_date: Optional[date] = None
    scheduled_time: Optional[time] = None
    duration_minutes: int
    is_all_day: bool
    status: TaskStatusEnum
    priority: TaskPriorityEnum

    class Config:
        from_attributes = True


class TaskListResponse(BaseModel):
    """Paginated task list."""
    items: List[TaskListItem]
    total: int
    page: int
    size: int


# Calendar view schemas
class CalendarEvent(BaseModel):
    """Calendar event for rendering."""
    id: UUID
    title: str
    start: datetime
    end: datetime
    allDay: bool
    color: str
    status: TaskStatusEnum
    priority: TaskPriorityEnum
    client_name: Optional[str] = None


class CalendarResponse(BaseModel):
    """Calendar events response."""
    events: List[CalendarEvent]
    start_date: date
    end_date: date
