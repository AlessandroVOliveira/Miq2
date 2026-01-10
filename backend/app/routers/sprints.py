"""Sprint router for weekly meetings."""
from typing import Optional
from uuid import UUID
from datetime import datetime, date, timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Sprint, SprintTask, Task, User, SprintStatus, TaskStatus
from app.schemas.sprint import (
    SprintCreate, SprintUpdate, SprintResponse,
    SprintListResponse, SprintListItem,
    SprintTaskCreate, SprintTaskResponse,
    SprintAgenda, SprintSummary, TaskBasic,
    SprintStatusEnum
)
from app.middleware.auth import get_current_active_user, require_permission

router = APIRouter(prefix="/sprints", tags=["Sprints"])


def get_week_dates(target_date: date = None):
    """Get start (Monday) and end (Sunday) of the week."""
    if target_date is None:
        target_date = date.today()
    start = target_date - timedelta(days=target_date.weekday())
    end = start + timedelta(days=6)
    return start, end


@router.get("", response_model=SprintListResponse)
async def list_sprints(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: Optional[SprintStatusEnum] = None,
    team_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks", "read"))
):
    """List sprints with filters."""
    query = db.query(Sprint)
    
    if status:
        query = query.filter(Sprint.status == status.value)
    if team_id:
        query = query.filter(Sprint.team_id == team_id)
    
    total = query.count()
    sprints = query.order_by(Sprint.start_date.desc()).offset((page - 1) * size).limit(size).all()
    
    items = []
    for s in sprints:
        task_count = len(s.sprint_tasks)
        completed_count = sum(1 for st in s.sprint_tasks if st.task.status == TaskStatus.COMPLETED)
        items.append(SprintListItem(
            id=s.id, title=s.title, start_date=s.start_date, end_date=s.end_date,
            status=s.status, team=s.team, task_count=task_count, completed_count=completed_count,
            created_at=s.created_at
        ))
    
    return SprintListResponse(items=items, total=total, page=page, size=size)


@router.post("", response_model=SprintResponse, status_code=status.HTTP_201_CREATED)
async def create_sprint(
    data: SprintCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks", "create"))
):
    """Create a new sprint."""
    sprint = Sprint(**data.model_dump())
    db.add(sprint)
    db.commit()
    db.refresh(sprint)
    return sprint


@router.get("/current", response_model=SprintResponse)
async def get_current_sprint(
    team_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks", "read"))
):
    """Get the sprint for the current week, or create one if it doesn't exist."""
    start, end = get_week_dates()
    
    query = db.query(Sprint).filter(
        Sprint.start_date <= date.today(),
        Sprint.end_date >= date.today()
    )
    if team_id:
        query = query.filter(Sprint.team_id == team_id)
    
    sprint = query.first()
    
    if not sprint:
        # Auto-create sprint for current week
        sprint = Sprint(
            title=f"Sprint {start.strftime('%d/%m')} - {end.strftime('%d/%m/%Y')}",
            start_date=start,
            end_date=end,
            team_id=team_id
        )
        db.add(sprint)
        db.commit()
        db.refresh(sprint)
    
    return sprint


@router.get("/{sprint_id}", response_model=SprintResponse)
async def get_sprint(
    sprint_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks", "read"))
):
    """Get sprint details."""
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    return sprint


@router.put("/{sprint_id}", response_model=SprintResponse)
async def update_sprint(
    sprint_id: UUID,
    data: SprintUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks", "update"))
):
    """Update a sprint."""
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    
    update_data = data.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"]:
        update_data["status"] = update_data["status"].value
    
    for field, value in update_data.items():
        setattr(sprint, field, value)
    db.commit()
    db.refresh(sprint)
    return sprint


@router.delete("/{sprint_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sprint(
    sprint_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks", "delete"))
):
    """Delete a sprint."""
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    db.delete(sprint)
    db.commit()


@router.post("/{sprint_id}/complete", response_model=SprintResponse)
async def complete_sprint(
    sprint_id: UUID,
    meeting_notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks", "update"))
):
    """Complete a sprint and optionally add meeting notes."""
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    
    sprint.status = SprintStatus.COMPLETED
    sprint.meeting_date = datetime.utcnow()
    if meeting_notes:
        sprint.meeting_notes = meeting_notes
    
    db.commit()
    db.refresh(sprint)
    return sprint


# Sprint Tasks
@router.get("/{sprint_id}/tasks", response_model=list[SprintTaskResponse])
async def list_sprint_tasks(
    sprint_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks", "read"))
):
    """List tasks in a sprint."""
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    return sprint.sprint_tasks


@router.post("/{sprint_id}/tasks", response_model=SprintTaskResponse, status_code=status.HTTP_201_CREATED)
async def add_task_to_sprint(
    sprint_id: UUID,
    data: SprintTaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks", "update"))
):
    """Add a task to a sprint."""
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    
    task = db.query(Task).filter(Task.id == data.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check if task already in sprint
    existing = db.query(SprintTask).filter(
        SprintTask.sprint_id == sprint_id,
        SprintTask.task_id == data.task_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Task already in sprint")
    
    sprint_task = SprintTask(sprint_id=sprint_id, **data.model_dump())
    db.add(sprint_task)
    db.commit()
    db.refresh(sprint_task)
    return sprint_task


@router.delete("/{sprint_id}/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_task_from_sprint(
    sprint_id: UUID,
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks", "update"))
):
    """Remove a task from a sprint."""
    sprint_task = db.query(SprintTask).filter(
        SprintTask.sprint_id == sprint_id,
        SprintTask.task_id == task_id
    ).first()
    if not sprint_task:
        raise HTTPException(status_code=404, detail="Task not in sprint")
    db.delete(sprint_task)
    db.commit()


# Agenda and Summary
@router.get("/{sprint_id}/agenda", response_model=SprintAgenda)
async def get_sprint_agenda(
    sprint_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks", "read"))
):
    """Generate automatic meeting agenda for a sprint."""
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    
    completed = []
    pending = []
    blocked = []
    carried_over = []
    
    for st in sprint.sprint_tasks:
        task = st.task
        task_basic = TaskBasic(
            id=task.id, title=task.title, status=task.status.value,
            priority=task.priority.value, scheduled_date=task.scheduled_date
        )
        
        if st.carried_over:
            carried_over.append(task_basic)
        
        if task.status == TaskStatus.COMPLETED:
            completed.append(task_basic)
        elif task.status == TaskStatus.BLOCKED:
            blocked.append(task_basic)
        else:
            pending.append(task_basic)
    
    return SprintAgenda(
        sprint_id=sprint.id,
        sprint_title=sprint.title,
        period=f"{sprint.start_date.strftime('%d/%m')} - {sprint.end_date.strftime('%d/%m/%Y')}",
        generated_at=datetime.utcnow(),
        completed_tasks=completed,
        pending_tasks=pending,
        blocked_tasks=blocked,
        carried_over=carried_over
    )


@router.get("/{sprint_id}/summary", response_model=SprintSummary)
async def get_sprint_summary(
    sprint_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks", "read"))
):
    """Get sprint summary statistics."""
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    
    total = len(sprint.sprint_tasks)
    completed = 0
    in_progress = 0
    pending = 0
    blocked = 0
    
    for st in sprint.sprint_tasks:
        if st.task.status == TaskStatus.COMPLETED:
            completed += 1
        elif st.task.status == TaskStatus.IN_PROGRESS:
            in_progress += 1
        elif st.task.status == TaskStatus.BLOCKED:
            blocked += 1
        else:
            pending += 1
    
    completion_percentage = (completed / total * 100) if total > 0 else 0
    
    return SprintSummary(
        sprint_id=sprint.id,
        total_tasks=total,
        completed=completed,
        in_progress=in_progress,
        pending=pending,
        blocked=blocked,
        completion_percentage=round(completion_percentage, 1)
    )
