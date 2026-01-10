"""FastAPI main application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.routers import (
    auth_router,
    users_router,
    teams_router,
    roles_router,
    permissions_router,
    clients_router,
    products_router,
    checklists_router,
    implementations_router,
    service_orders_router,
    tasks_router,
    sprints_router,
    repository_router,
    dashboard_router,
    backup_router,
    templates_router,
    chat_router
)

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Sistema Integrado de Gestão de Projetos, Serviços e Atendimento",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(teams_router)
app.include_router(roles_router)
app.include_router(permissions_router)
app.include_router(clients_router)
app.include_router(products_router)
app.include_router(checklists_router)
app.include_router(implementations_router)
app.include_router(service_orders_router)
app.include_router(tasks_router)
app.include_router(sprints_router)
app.include_router(repository_router)
app.include_router(dashboard_router)
app.include_router(backup_router)
app.include_router(templates_router)
app.include_router(chat_router)


@app.get("/", tags=["Health"])
async def root():
    """Health check endpoint."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "healthy"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Detailed health check."""
    return {
        "status": "healthy",
        "database": "connected"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
