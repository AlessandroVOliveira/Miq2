"""Pydantic schemas for Checklist templates and items."""
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field


class ChecklistItemBase(BaseModel):
    """Base checklist item schema."""
    category: Optional[str] = Field(None, max_length=100)
    title: str = Field(..., min_length=1, max_length=300)
    description: Optional[str] = None
    order: int = 0
    estimated_hours: int = 0


class ChecklistItemCreate(ChecklistItemBase):
    """Schema for creating a checklist item."""
    pass


class ChecklistItemUpdate(BaseModel):
    """Schema for updating a checklist item."""
    category: Optional[str] = Field(None, max_length=100)
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    description: Optional[str] = None
    order: Optional[int] = None
    estimated_hours: Optional[int] = None


class ChecklistItemResponse(ChecklistItemBase):
    """Schema for checklist item response."""
    id: UUID
    template_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ChecklistTemplateBase(BaseModel):
    """Base checklist template schema."""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    version: str = "1.0"
    is_active: bool = True


class ChecklistTemplateCreate(ChecklistTemplateBase):
    """Schema for creating a checklist template."""
    items: Optional[List[ChecklistItemCreate]] = []


class ChecklistTemplateUpdate(BaseModel):
    """Schema for updating a checklist template."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    version: Optional[str] = None
    is_active: Optional[bool] = None


class ChecklistTemplateResponse(ChecklistTemplateBase):
    """Schema for checklist template response."""
    id: UUID
    created_at: datetime
    updated_at: datetime
    items: List[ChecklistItemResponse] = []

    class Config:
        from_attributes = True


class ChecklistTemplateListResponse(BaseModel):
    """Schema for paginated checklist template list."""
    items: List[ChecklistTemplateResponse]
    total: int
    page: int
    size: int


class ChecklistItemReorder(BaseModel):
    """Schema for reordering checklist items."""
    item_ids: List[UUID]
