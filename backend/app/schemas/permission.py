"""Permission Pydantic schemas."""
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field


class PermissionBase(BaseModel):
    """Base permission schema."""
    resource: str = Field(..., min_length=2, max_length=100)
    action: str = Field(..., min_length=2, max_length=50)
    description: Optional[str] = None


class PermissionCreate(PermissionBase):
    """Schema for creating a permission."""
    pass


class PermissionResponse(PermissionBase):
    """Schema for permission response."""
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class PermissionListResponse(BaseModel):
    """Schema for paginated permission list."""
    items: List[PermissionResponse]
    total: int
    page: int
    size: int
