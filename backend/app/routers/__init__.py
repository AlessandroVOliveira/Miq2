"""Routers package initialization."""
from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.teams import router as teams_router
from app.routers.roles import router as roles_router
from app.routers.permissions import router as permissions_router
from app.routers.clients import router as clients_router
from app.routers.products import router as products_router
from app.routers.checklists import router as checklists_router
from app.routers.implementations import router as implementations_router
from app.routers.service_orders import router as service_orders_router
from app.routers.tasks import router as tasks_router
from app.routers.sprints import router as sprints_router
from app.routers.repository import router as repository_router
from app.routers.dashboard import router as dashboard_router
from app.routers.backup import router as backup_router
from app.routers.templates import router as templates_router
from app.routers.chat import router as chat_router

__all__ = [
    "auth_router",
    "users_router",
    "teams_router",
    "roles_router",
    "permissions_router",
    "clients_router",
    "products_router",
    "checklists_router",
    "implementations_router",
    "service_orders_router",
    "tasks_router",
    "sprints_router",
    "repository_router",
    "dashboard_router",
    "backup_router",
    "templates_router",
    "chat_router",
]


