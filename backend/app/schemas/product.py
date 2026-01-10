"""Pydantic schemas for Product."""
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field


class ProductBase(BaseModel):
    """Base Product schema."""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    version: Optional[str] = Field(None, max_length=50)
    is_active: bool = True


class ProductCreate(ProductBase):
    """Schema for creating a product."""
    pass


class ProductUpdate(BaseModel):
    """Schema for updating a product."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    version: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None


class ChecklistTemplateBasic(BaseModel):
    """Basic checklist template info for product responses."""
    id: UUID
    name: str
    version: Optional[str] = None

    class Config:
        from_attributes = True


class ProductChecklistResponse(BaseModel):
    """Schema for product-checklist association."""
    id: UUID
    template: ChecklistTemplateBasic
    is_default: bool

    class Config:
        from_attributes = True


class ProductResponse(ProductBase):
    """Schema for product response."""
    id: UUID
    created_at: datetime
    updated_at: datetime
    checklists: List[ProductChecklistResponse] = []

    class Config:
        from_attributes = True


class ProductListResponse(BaseModel):
    """Schema for paginated product list."""
    items: List[ProductResponse]
    total: int
    page: int
    size: int


class ProductChecklistCreate(BaseModel):
    """Schema for associating a checklist with a product."""
    template_id: UUID
    is_default: bool = False
