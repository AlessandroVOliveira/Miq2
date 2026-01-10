"""Permission service for authorization checks."""
from typing import List, Set
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.user import User
from app.models.permission import Permission


class PermissionService:
    """Service for permission/authorization operations."""

    @staticmethod
    def get_user_permissions(db: Session, user: User) -> Set[str]:
        """Get all permissions for a user based on their roles.
        
        Returns a set of permission strings in format 'resource:action'.
        """
        permissions = set()
        
        # Superusers have all permissions
        if user.is_superuser:
            all_permissions = db.query(Permission).all()
            return {f"{p.resource}:{p.action}" for p in all_permissions}
        
        # Get permissions from user's roles
        for role in user.roles:
            for permission in role.permissions:
                permissions.add(f"{permission.resource}:{permission.action}")
        
        return permissions

    @staticmethod
    def has_permission(db: Session, user: User, resource: str, action: str) -> bool:
        """Check if a user has a specific permission."""
        if user.is_superuser:
            return True
        
        permissions = PermissionService.get_user_permissions(db, user)
        return f"{resource}:{action}" in permissions

    @staticmethod
    def has_any_permission(db: Session, user: User, required: List[str]) -> bool:
        """Check if a user has any of the required permissions.
        
        Args:
            required: List of permission strings in format 'resource:action'
        """
        if user.is_superuser:
            return True
        
        permissions = PermissionService.get_user_permissions(db, user)
        return bool(permissions & set(required))

    @staticmethod
    def has_all_permissions(db: Session, user: User, required: List[str]) -> bool:
        """Check if a user has all of the required permissions.
        
        Args:
            required: List of permission strings in format 'resource:action'
        """
        if user.is_superuser:
            return True
        
        permissions = PermissionService.get_user_permissions(db, user)
        return set(required).issubset(permissions)
