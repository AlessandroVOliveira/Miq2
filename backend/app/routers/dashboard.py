"""Dashboard router for analytics and metrics."""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from app.database import get_db
from app.models import (
    User, Client, Implementation, ImplementationStatus,
    ServiceOrder, ServiceOrderStatus, Task, TaskStatus, Sprint
)
from app.middleware.auth import require_permission

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


class DashboardSummary(BaseModel):
    """Dashboard summary stats."""
    total_clients: int
    active_clients: int
    total_implementations: int
    implementations_in_progress: int
    implementations_completed: int
    total_service_orders: int
    service_orders_open: int
    service_orders_in_progress: int
    total_tasks: int
    tasks_pending: int
    tasks_blocked: int


class ImplementationStats(BaseModel):
    """Implementation statistics."""
    total: int
    by_status: dict[str, int]
    average_progress: float


class ServiceOrderStats(BaseModel):
    """Service order statistics."""
    total: int
    by_status: dict[str, int]
    by_priority: dict[str, int]


class TaskStats(BaseModel):
    """Task statistics."""
    total: int
    by_status: dict[str, int]
    by_priority: dict[str, int]


class RecentActivity(BaseModel):
    """Recent activity item."""
    type: str
    title: str
    status: str
    created_at: str


class FullDashboard(BaseModel):
    """Complete dashboard data."""
    summary: DashboardSummary
    implementations: ImplementationStats
    service_orders: ServiceOrderStats
    tasks: TaskStats
    recent_activities: list[RecentActivity]


@router.get("/summary", response_model=DashboardSummary)
async def get_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks", "read"))
):
    """Get dashboard summary."""
    return DashboardSummary(
        total_clients=db.query(Client).count(),
        active_clients=db.query(Client).filter(Client.is_active == True).count(),
        total_implementations=db.query(Implementation).count(),
        implementations_in_progress=db.query(Implementation).filter(
            Implementation.status == ImplementationStatus.IN_PROGRESS
        ).count(),
        implementations_completed=db.query(Implementation).filter(
            Implementation.status == ImplementationStatus.COMPLETED
        ).count(),
        total_service_orders=db.query(ServiceOrder).count(),
        service_orders_open=db.query(ServiceOrder).filter(
            ServiceOrder.status == ServiceOrderStatus.OPEN
        ).count(),
        service_orders_in_progress=db.query(ServiceOrder).filter(
            ServiceOrder.status == ServiceOrderStatus.IN_PROGRESS
        ).count(),
        total_tasks=db.query(Task).count(),
        tasks_pending=db.query(Task).filter(Task.status == TaskStatus.SCHEDULED).count(),
        tasks_blocked=db.query(Task).filter(Task.status == TaskStatus.BLOCKED).count(),
    )


@router.get("/implementations", response_model=ImplementationStats)
async def get_implementation_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks", "read"))
):
    """Get implementation statistics."""
    implementations = db.query(Implementation).all()
    
    by_status = {}
    total_progress = 0
    
    for impl in implementations:
        status_key = impl.status.value if impl.status else "unknown"
        by_status[status_key] = by_status.get(status_key, 0) + 1
        total_progress += impl.progress_percentage or 0
    
    avg_progress = total_progress / len(implementations) if implementations else 0
    
    return ImplementationStats(
        total=len(implementations),
        by_status=by_status,
        average_progress=round(avg_progress, 1)
    )


@router.get("/service-orders", response_model=ServiceOrderStats)
async def get_service_order_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks", "read"))
):
    """Get service order statistics."""
    orders = db.query(ServiceOrder).all()
    
    by_status = {}
    by_priority = {}
    
    for order in orders:
        status_key = order.status.value if order.status else "unknown"
        priority_key = order.priority.value if order.priority else "unknown"
        by_status[status_key] = by_status.get(status_key, 0) + 1
        by_priority[priority_key] = by_priority.get(priority_key, 0) + 1
    
    return ServiceOrderStats(
        total=len(orders),
        by_status=by_status,
        by_priority=by_priority
    )


@router.get("/tasks", response_model=TaskStats)
async def get_task_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks", "read"))
):
    """Get task statistics."""
    tasks = db.query(Task).all()
    
    by_status = {}
    by_priority = {}
    
    for task in tasks:
        status_key = task.status.value if task.status else "unknown"
        priority_key = task.priority.value if task.priority else "unknown"
        by_status[status_key] = by_status.get(status_key, 0) + 1
        by_priority[priority_key] = by_priority.get(priority_key, 0) + 1
    
    return TaskStats(
        total=len(tasks),
        by_status=by_status,
        by_priority=by_priority
    )


@router.get("", response_model=FullDashboard)
async def get_full_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks", "read"))
):
    """Get complete dashboard data."""
    summary = await get_summary(db, current_user)
    implementations = await get_implementation_stats(db, current_user)
    service_orders = await get_service_order_stats(db, current_user)
    tasks = await get_task_stats(db, current_user)
    
    # Recent activities
    recent_impls = db.query(Implementation).order_by(Implementation.created_at.desc()).limit(3).all()
    recent_orders = db.query(ServiceOrder).order_by(ServiceOrder.created_at.desc()).limit(3).all()
    recent_tasks = db.query(Task).order_by(Task.created_at.desc()).limit(3).all()
    
    activities = []
    for impl in recent_impls:
        activities.append(RecentActivity(
            type="implementation", title=impl.title,
            status=impl.status.value if impl.status else "unknown",
            created_at=impl.created_at.isoformat()
        ))
    for order in recent_orders:
        activities.append(RecentActivity(
            type="service_order", title=order.title,
            status=order.status.value if order.status else "unknown",
            created_at=order.created_at.isoformat()
        ))
    for task in recent_tasks:
        activities.append(RecentActivity(
            type="task", title=task.title,
            status=task.status.value if task.status else "unknown",
            created_at=task.created_at.isoformat()
        ))
    
    # Sort by created_at
    activities.sort(key=lambda x: x.created_at, reverse=True)
    
    return FullDashboard(
        summary=summary,
        implementations=implementations,
        service_orders=service_orders,
        tasks=tasks,
        recent_activities=activities[:10]
    )
