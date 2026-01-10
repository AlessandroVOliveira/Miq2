"""Permissions router."""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.permission import Permission
from app.models.user import User
from app.schemas.permission import PermissionCreate, PermissionResponse, PermissionListResponse
from app.middleware.auth import require_permission as require_perm

router = APIRouter(prefix="/permissions", tags=["Permissions"])


@router.get("", response_model=PermissionListResponse)
async def list_permissions(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    resource: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_perm("permissions", "read"))
):
    """List all permissions with pagination."""
    query = db.query(Permission)
    
    if resource:
        query = query.filter(Permission.resource == resource)
    
    total = query.count()
    permissions = query.order_by(Permission.resource, Permission.action).offset((page - 1) * size).limit(size).all()
    
    return PermissionListResponse(items=permissions, total=total, page=page, size=size)


@router.get("/{permission_id}", response_model=PermissionResponse)
async def get_permission(
    permission_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_perm("permissions", "read"))
):
    """Get a specific permission by ID."""
    permission = db.query(Permission).filter(Permission.id == permission_id).first()
    if not permission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Permission not found")
    return permission


@router.post("", response_model=PermissionResponse, status_code=status.HTTP_201_CREATED)
async def create_permission(
    perm_data: PermissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_perm("permissions", "create"))
):
    """Create a new permission."""
    # Check if resource:action combination exists
    existing = db.query(Permission).filter(
        Permission.resource == perm_data.resource,
        Permission.action == perm_data.action
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Permission {perm_data.resource}:{perm_data.action} already exists"
        )
    
    permission = Permission(**perm_data.model_dump())
    db.add(permission)
    db.commit()
    db.refresh(permission)
    
    return permission


@router.delete("/{permission_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_permission(
    permission_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_perm("permissions", "delete"))
):
    """Delete a permission."""
    permission = db.query(Permission).filter(Permission.id == permission_id).first()
    if not permission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Permission not found")
    
    db.delete(permission)
    db.commit()
