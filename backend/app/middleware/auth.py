"""Authentication and authorization middleware."""
from typing import Callable, List
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.services.auth import AuthService
from app.services.permission import PermissionService


# OAuth2 scheme for token extraction
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Get the current authenticated user from JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Decode token
    payload = AuthService.decode_token(token)
    if payload is None:
        raise credentials_exception
    
    # Check token type
    if payload.type != "access":
        raise credentials_exception
    
    # Get user
    try:
        user_id = UUID(payload.sub)
    except ValueError:
        raise credentials_exception
    
    user = AuthService.get_user_by_id(db, user_id)
    if user is None:
        raise credentials_exception
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get the current active user (raises if inactive)."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    return current_user


def require_permission(resource: str, action: str) -> Callable:
    """Dependency factory that requires a specific permission.
    
    Usage:
        @router.get("/users", dependencies=[Depends(require_permission("users", "read"))])
    """
    async def permission_checker(
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
    ):
        if not PermissionService.has_permission(db, current_user, resource, action):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {resource}:{action}"
            )
        return current_user
    
    return permission_checker


def require_any_permission(permissions: List[str]) -> Callable:
    """Dependency factory that requires any of the specified permissions.
    
    Args:
        permissions: List of permission strings in format 'resource:action'
    """
    async def permission_checker(
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
    ):
        if not PermissionService.has_any_permission(db, current_user, permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied"
            )
        return current_user
    
    return permission_checker
