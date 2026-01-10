"""Dashboard router for analytics and metrics."""
from typing import Optional
from uuid import UUID
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from app.database import get_db
from app.models import (
    User, Client, Implementation, ImplementationStatus,
    ServiceOrder, ServiceOrderStatus, Task, TaskStatus, Sprint
)
from app.models.chat import Chat, ChatStatus, ChatMessage
from app.models.team import Team
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


# ==================== Chat Analytics ====================

class ChatStats(BaseModel):
    """Chat statistics for analytics."""
    total_conversations: int
    conversations_waiting: int
    conversations_in_progress: int
    conversations_closed: int
    total_messages: int
    messages_sent: int
    messages_received: int
    average_rating: float
    average_response_time_minutes: float
    by_team: dict[str, int]
    by_date: dict[str, int]


class ChatTeamStats(BaseModel):
    """Statistics for a specific team."""
    team_id: str
    team_name: str
    total_conversations: int
    closed_conversations: int
    average_rating: float
    total_messages: int


class ChatAgentStats(BaseModel):
    """Statistics for a specific agent/user."""
    user_id: str
    user_name: str
    total_conversations: int
    closed_conversations: int
    average_rating: float
    total_messages_sent: int


class ChatDailyStats(BaseModel):
    """Daily chat statistics."""
    date: str
    new_conversations: int
    closed_conversations: int
    messages_sent: int
    messages_received: int


class PowerBIExport(BaseModel):
    """Data export format for Power BI."""
    conversations: list[dict]
    messages_summary: dict
    team_performance: list[ChatTeamStats]
    daily_metrics: list[ChatDailyStats]


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


# ==================== Chat Analytics Endpoints ====================

@router.get("/chat-stats", response_model=ChatStats)
async def get_chat_stats(
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    team_id: Optional[UUID] = Query(None, description="Filter by team"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("chat", "read"))
):
    """Get chat statistics for analytics and Power BI."""
    query = db.query(Chat)
    
    if start_date:
        query = query.filter(Chat.created_at >= start_date)
    if end_date:
        query = query.filter(Chat.created_at <= end_date)
    if team_id:
        query = query.filter(Chat.team_id == team_id)
    
    chats = query.all()
    
    # Count by status
    waiting = sum(1 for c in chats if c.status == ChatStatus.WAITING)
    in_progress = sum(1 for c in chats if c.status == ChatStatus.IN_PROGRESS)
    closed = sum(1 for c in chats if c.status == ChatStatus.CLOSED)
    
    # Messages
    chat_ids = [c.id for c in chats]
    messages_query = db.query(ChatMessage).filter(ChatMessage.chat_id.in_(chat_ids)) if chat_ids else []
    messages = list(messages_query) if chat_ids else []
    
    messages_sent = sum(1 for m in messages if m.from_me)
    messages_received = sum(1 for m in messages if not m.from_me)
    
    # Average rating
    rated_chats = [c for c in chats if c.rating is not None]
    avg_rating = sum(c.rating for c in rated_chats) / len(rated_chats) if rated_chats else 0
    
    # By team
    by_team = {}
    for c in chats:
        if c.team_id:
            team = db.query(Team).filter(Team.id == c.team_id).first()
            team_name = team.name if team else str(c.team_id)
            by_team[team_name] = by_team.get(team_name, 0) + 1
    
    # By date
    by_date = {}
    for c in chats:
        date_key = c.created_at.strftime("%Y-%m-%d")
        by_date[date_key] = by_date.get(date_key, 0) + 1
    
    return ChatStats(
        total_conversations=len(chats),
        conversations_waiting=waiting,
        conversations_in_progress=in_progress,
        conversations_closed=closed,
        total_messages=len(messages),
        messages_sent=messages_sent,
        messages_received=messages_received,
        average_rating=round(avg_rating, 2),
        average_response_time_minutes=0,  # TODO: calculate from message timestamps
        by_team=by_team,
        by_date=by_date
    )


@router.get("/chat/teams", response_model=list[ChatTeamStats])
async def get_chat_team_performance(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("chat", "read"))
):
    """Get chat performance statistics by team."""
    teams = db.query(Team).filter(Team.is_active == True).all()
    results = []
    
    for team in teams:
        query = db.query(Chat).filter(Chat.team_id == team.id)
        if start_date:
            query = query.filter(Chat.created_at >= start_date)
        if end_date:
            query = query.filter(Chat.created_at <= end_date)
        
        chats = query.all()
        closed = [c for c in chats if c.status == ChatStatus.CLOSED]
        rated = [c for c in closed if c.rating is not None]
        avg_rating = sum(c.rating for c in rated) / len(rated) if rated else 0
        
        chat_ids = [c.id for c in chats]
        msg_count = db.query(ChatMessage).filter(
            ChatMessage.chat_id.in_(chat_ids)
        ).count() if chat_ids else 0
        
        results.append(ChatTeamStats(
            team_id=str(team.id),
            team_name=team.name,
            total_conversations=len(chats),
            closed_conversations=len(closed),
            average_rating=round(avg_rating, 2),
            total_messages=msg_count
        ))
    
    return results


@router.get("/chat/daily", response_model=list[ChatDailyStats])
async def get_chat_daily_metrics(
    days: int = Query(30, description="Number of days to return"),
    team_id: Optional[UUID] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("chat", "read"))
):
    """Get daily chat metrics for the last N days."""
    results = []
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    
    for i in range(days):
        day_start = today - timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        
        query = db.query(Chat).filter(
            Chat.created_at >= day_start,
            Chat.created_at < day_end
        )
        if team_id:
            query = query.filter(Chat.team_id == team_id)
        
        new_chats = query.count()
        closed_chats = db.query(Chat).filter(
            Chat.closed_at >= day_start,
            Chat.closed_at < day_end
        ).count()
        
        # Messages for that day
        chat_ids = [c.id for c in query.all()]
        if chat_ids:
            msgs = db.query(ChatMessage).filter(
                ChatMessage.chat_id.in_(chat_ids),
                ChatMessage.timestamp >= day_start,
                ChatMessage.timestamp < day_end
            ).all()
            sent = sum(1 for m in msgs if m.from_me)
            received = sum(1 for m in msgs if not m.from_me)
        else:
            sent = received = 0
        
        results.append(ChatDailyStats(
            date=day_start.strftime("%Y-%m-%d"),
            new_conversations=new_chats,
            closed_conversations=closed_chats,
            messages_sent=sent,
            messages_received=received
        ))
    
    return results


@router.get("/powerbi/export", response_model=PowerBIExport)
async def export_for_powerbi(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("chat", "read"))
):
    """Export all chat data in a format optimized for Power BI."""
    query = db.query(Chat)
    if start_date:
        query = query.filter(Chat.created_at >= start_date)
    if end_date:
        query = query.filter(Chat.created_at <= end_date)
    
    chats = query.all()
    
    # Conversations list
    conversations = []
    for c in chats:
        team = db.query(Team).filter(Team.id == c.team_id).first() if c.team_id else None
        conversations.append({
            "id": str(c.id),
            "protocol": c.protocol,
            "status": c.status.value if c.status else None,
            "team_id": str(c.team_id) if c.team_id else None,
            "team_name": team.name if team else None,
            "rating": c.rating,
            "classification": c.classification,
            "created_at": c.created_at.isoformat(),
            "closed_at": c.closed_at.isoformat() if c.closed_at else None,
        })
    
    # Messages summary
    chat_ids = [c.id for c in chats]
    total_msgs = db.query(ChatMessage).filter(ChatMessage.chat_id.in_(chat_ids)).count() if chat_ids else 0
    sent_msgs = db.query(ChatMessage).filter(
        ChatMessage.chat_id.in_(chat_ids),
        ChatMessage.from_me == True
    ).count() if chat_ids else 0
    
    messages_summary = {
        "total": total_msgs,
        "sent": sent_msgs,
        "received": total_msgs - sent_msgs
    }
    
    # Team performance
    team_stats = await get_chat_team_performance(start_date, end_date, db, current_user)
    
    # Daily metrics
    daily_stats = await get_chat_daily_metrics(30, None, db, current_user)
    
    return PowerBIExport(
        conversations=conversations,
        messages_summary=messages_summary,
        team_performance=team_stats,
        daily_metrics=daily_stats
    )
