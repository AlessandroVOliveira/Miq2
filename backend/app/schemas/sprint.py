"""Pydantic schemas for Sprint/Weekly Meetings."""
from datetime import datetime, date
from typing import Optional, List
from uuid import UUID
from enum import Enum
from pydantic import BaseModel, Field


class SprintStatusEnum(str, Enum):
    """Sprint status options."""
    ACTIVE = "active"
    COMPLETED = "completed"
    ARCHIVED = "archived"


# Basic schemas for nested responses
class TeamBasic(BaseModel):
    id: UUID
    name: str

    class Config:
        from_attributes = True


class TaskBasic(BaseModel):
    id: UUID
    title: str
    status: str
    priority: str
    scheduled_date: Optional[date] = None

    class Config:
        from_attributes = True


# Sprint Task schemas
class SprintTaskCreate(BaseModel):
    """Create sprint task association."""
    task_id: UUID
    carried_over: bool = False
    notes: Optional[str] = None


class SprintTaskResponse(BaseModel):
    """Sprint task response."""
    id: UUID
    sprint_id: UUID
    task: TaskBasic
    carried_over: bool
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Sprint schemas
class SprintBase(BaseModel):
    """Base sprint schema."""
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    start_date: date
    end_date: date
    team_id: Optional[UUID] = None


class SprintCreate(SprintBase):
    """Create sprint schema."""
    pass


class SprintUpdate(BaseModel):
    """Update sprint schema."""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    team_id: Optional[UUID] = None
    status: Optional[SprintStatusEnum] = None
    meeting_notes: Optional[str] = None
    meeting_date: Optional[datetime] = None


class SprintResponse(SprintBase):
    """Sprint response schema."""
    id: UUID
    status: SprintStatusEnum
    meeting_notes: Optional[str] = None
    meeting_date: Optional[datetime] = None
    team: Optional[TeamBasic] = None
    sprint_tasks: List[SprintTaskResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SprintListItem(BaseModel):
    """Sprint list item schema."""
    id: UUID
    title: str
    start_date: date
    end_date: date
    status: SprintStatusEnum
    team: Optional[TeamBasic] = None
    task_count: int = 0
    completed_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class SprintListResponse(BaseModel):
    """Paginated sprint list."""
    items: List[SprintListItem]
    total: int
    page: int
    size: int


# Agenda and Summary schemas
class AgendaItem(BaseModel):
    """Agenda item for meeting."""
    category: str
    items: List[TaskBasic]


class SprintAgenda(BaseModel):
    """Automatic meeting agenda."""
    sprint_id: UUID
    sprint_title: str
    period: str
    generated_at: datetime
    completed_tasks: List[TaskBasic]
    pending_tasks: List[TaskBasic]
    blocked_tasks: List[TaskBasic]
    carried_over: List[TaskBasic]


class SprintSummary(BaseModel):
    """Sprint summary stats."""
    sprint_id: UUID
    total_tasks: int
    completed: int
    in_progress: int
    pending: int
    blocked: int
    completion_percentage: float
