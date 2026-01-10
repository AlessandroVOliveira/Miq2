"""Tasks and Calendar router."""
from typing import Optional
from uuid import UUID
from datetime import datetime, date, timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Task, TaskDiary, TaskBlocker, User, TaskStatus
from app.schemas.task import (
    TaskCreate, TaskUpdate, TaskResponse, TaskListResponse, TaskListItem,
    TaskDiaryCreate, TaskDiaryResponse,
    TaskBlockerCreate, TaskBlockerResolve, TaskBlockerResponse,
    CalendarResponse, CalendarEvent,
    TaskStatusEnum, TaskPriorityEnum
)
from app.middleware.auth import get_current_active_user, require_permission

router = APIRouter(prefix="/tasks", tags=["Tasks"])

# Priority colors for calendar
PRIORITY_COLORS = {
    "low": "#52c41a",      # Green
    "medium": "#1890ff",   # Blue
    "high": "#faad14",     # Orange
    "urgent": "#ff4d4f",   # Red
}


# ========== Tasks ==========
@router.get("", response_model=TaskListResponse)
async def list_tasks(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[TaskStatusEnum] = None,
    assigned_user_id: Optional[UUID] = None,
    client_id: Optional[UUID] = None,
    scheduled_date: Optional[date] = None,
    completed_after: Optional[date] = None,
    completed_before: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks", "read"))
):
    """List tasks with filters."""
    query = db.query(Task)
    
    # Non-superusers can only see their own tasks
    if not current_user.is_superuser:
        query = query.filter(Task.assigned_user_id == current_user.id)
    elif assigned_user_id:
        # Superusers can filter by specific user
        query = query.filter(Task.assigned_user_id == assigned_user_id)
    
    if search:
        query = query.filter(Task.title.ilike(f"%{search}%"))
    if status:
        query = query.filter(Task.status == status.value)
    if client_id:
        query = query.filter(Task.client_id == client_id)
    if scheduled_date:
        query = query.filter(Task.scheduled_date == scheduled_date)
    if completed_after:
        query = query.filter(Task.completed_at >= datetime.combine(completed_after, datetime.min.time()))
    if completed_before:
        query = query.filter(Task.completed_at <= datetime.combine(completed_before, datetime.max.time()))
    
    total = query.count()
    tasks = query.order_by(Task.scheduled_date.desc().nullslast(), Task.created_at.desc()).offset((page - 1) * size).limit(size).all()
    
    items = [TaskListItem(
        id=t.id, title=t.title, assigned_user=t.assigned_user, client=t.client,
        scheduled_date=t.scheduled_date, scheduled_time=t.scheduled_time,
        duration_minutes=t.duration_minutes, is_all_day=t.is_all_day,
        status=t.status, priority=t.priority
    ) for t in tasks]
    
    return TaskListResponse(items=items, total=total, page=page, size=size)


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks", "create"))
):
    """Create a new task."""
    task = Task(**data.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/calendar", response_model=CalendarResponse)
async def get_calendar(
    start_date: date = Query(...),
    end_date: date = Query(...),
    assigned_user_id: Optional[UUID] = None,
    team_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks", "read"))
):
    """Get calendar events for a date range."""
    query = db.query(Task).filter(
        Task.scheduled_date >= start_date,
        Task.scheduled_date <= end_date
    )
    
    # Non-superusers can only see their own tasks
    if not current_user.is_superuser:
        query = query.filter(Task.assigned_user_id == current_user.id)
    elif assigned_user_id:
        # Superusers can filter by specific user
        query = query.filter(Task.assigned_user_id == assigned_user_id)
    
    if team_id:
        query = query.filter(Task.team_id == team_id)
    
    tasks = query.all()
    
    events = []
    for task in tasks:
        # Calculate start and end times
        if task.scheduled_time:
            start_dt = datetime.combine(task.scheduled_date, task.scheduled_time)
            end_dt = start_dt + timedelta(minutes=task.duration_minutes)
        else:
            start_dt = datetime.combine(task.scheduled_date, datetime.min.time())
            end_dt = datetime.combine(task.scheduled_date, datetime.max.time())
        
        events.append(CalendarEvent(
            id=task.id,
            title=task.title,
            start=start_dt,
            end=end_dt,
            allDay=task.is_all_day,
            color=PRIORITY_COLORS.get(task.priority.value, "#1890ff"),
            status=task.status,
            priority=task.priority,
            client_name=task.client.company_name if task.client else None
        ))
    
    return CalendarResponse(events=events, start_date=start_date, end_date=end_date)


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks", "read"))
):
    """Get a task with details."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: UUID,
    data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks", "update"))
):
    """Update a task."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = data.model_dump(exclude_unset=True)
    
    # Handle status change
    if "status" in update_data:
        if update_data["status"] == TaskStatusEnum.COMPLETED and task.status != TaskStatus.COMPLETED:
            task.completed_at = datetime.utcnow()
            task.completed_by_id = current_user.id
        update_data["status"] = update_data["status"].value
    if "priority" in update_data and update_data["priority"]:
        update_data["priority"] = update_data["priority"].value
    if "recurrence" in update_data and update_data["recurrence"]:
        update_data["recurrence"] = update_data["recurrence"].value
    
    for field, value in update_data.items():
        setattr(task, field, value)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks", "delete"))
):
    """Delete a task."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()


# ========== Task Diary ==========
@router.get("/{task_id}/diary", response_model=list[TaskDiaryResponse])
async def list_diary_entries(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks", "read"))
):
    """List diary entries for a task."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task.diary_entries


@router.post("/{task_id}/diary", response_model=TaskDiaryResponse, status_code=status.HTTP_201_CREATED)
async def add_diary_entry(
    task_id: UUID,
    data: TaskDiaryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks", "update"))
):
    """Add a diary entry to a task."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    entry = TaskDiary(task_id=task_id, user_id=current_user.id, content=data.content)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


# ========== Task Blockers ==========
@router.get("/{task_id}/blockers", response_model=list[TaskBlockerResponse])
async def list_blockers(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks", "read"))
):
    """List blockers for a task."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task.blockers


@router.post("/{task_id}/block", response_model=TaskBlockerResponse, status_code=status.HTTP_201_CREATED)
async def block_task(
    task_id: UUID,
    data: TaskBlockerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks", "update"))
):
    """Block a task with a reason."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Update task status
    task.status = TaskStatus.BLOCKED
    
    blocker = TaskBlocker(task_id=task_id, blocked_by_id=current_user.id, reason=data.reason)
    db.add(blocker)
    db.commit()
    db.refresh(blocker)
    return blocker


@router.post("/{task_id}/unblock", response_model=TaskResponse)
async def unblock_task(
    task_id: UUID,
    data: TaskBlockerResolve,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks", "update"))
):
    """Unblock a task."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Resolve all active blockers
    active_blockers = db.query(TaskBlocker).filter(
        TaskBlocker.task_id == task_id,
        TaskBlocker.resolved_at.is_(None)
    ).all()
    
    for blocker in active_blockers:
        blocker.resolved_at = datetime.utcnow()
        blocker.resolution_notes = data.resolution_notes
    
    # Update task status back to scheduled
    task.status = TaskStatus.SCHEDULED
    
    db.commit()
    db.refresh(task)
    return task
