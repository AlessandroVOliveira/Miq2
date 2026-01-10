"""Role Pydantic schemas."""
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field


class RoleBase(BaseModel):
    """Base role schema."""
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None


class RoleCreate(RoleBase):
    """Schema for creating a role."""
    permission_ids: List[UUID] = []


class RoleUpdate(BaseModel):
    """Schema for updating a role."""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = None
    permission_ids: Optional[List[UUID]] = None


class PermissionBasic(BaseModel):
    """Basic permission info for role response."""
    id: UUID
    resource: str
    action: str

    class Config:
        from_attributes = True


class RoleResponse(RoleBase):
    """Schema for role response."""
    id: UUID
    created_at: datetime
    updated_at: datetime
    permissions: List[PermissionBasic] = []

    class Config:
        from_attributes = True


class RoleListResponse(BaseModel):
    """Schema for paginated role list."""
    items: List[RoleResponse]
    total: int
    page: int
    size: int
