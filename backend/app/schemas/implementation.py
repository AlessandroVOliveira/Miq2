"""Pydantic schemas for Implementation management."""
from datetime import datetime, date
from typing import Optional, List
from uuid import UUID
from enum import Enum
from pydantic import BaseModel, Field


class ImplementationStatusEnum(str, Enum):
    """Implementation status options."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ItemStatusEnum(str, Enum):
    """Item status options."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class AttachmentTypeEnum(str, Enum):
    """Attachment type options."""
    ACCEPTANCE_TERM = "acceptance_term"
    INITIAL_REPORT = "initial_report"
    FINAL_REPORT = "final_report"
    OTHER = "other"


# Basic schemas for nested responses
class ClientBasic(BaseModel):
    id: UUID
    company_name: str

    class Config:
        from_attributes = True


class ProductBasic(BaseModel):
    id: UUID
    name: str

    class Config:
        from_attributes = True


class UserBasic(BaseModel):
    id: UUID
    name: str

    class Config:
        from_attributes = True


# Implementation Item schemas
class ImplementationItemBase(BaseModel):
    """Base implementation item schema."""
    category: Optional[str] = None
    title: str = Field(..., min_length=1, max_length=300)
    description: Optional[str] = None
    order: int = 0
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    estimated_hours: int = 0


class ImplementationItemCreate(ImplementationItemBase):
    """Schema for creating an implementation item."""
    pass


class ImplementationItemUpdate(BaseModel):
    """Schema for updating an implementation item."""
    category: Optional[str] = None
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    description: Optional[str] = None
    status: Optional[ItemStatusEnum] = None
    order: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    estimated_hours: Optional[int] = None
    notes: Optional[str] = None


class ImplementationItemResponse(ImplementationItemBase):
    """Schema for implementation item response."""
    id: UUID
    implementation_id: UUID
    status: ItemStatusEnum
    completed_at: Optional[datetime] = None
    completed_by: Optional[UserBasic] = None
    cancelled_at: Optional[datetime] = None
    cancelled_by: Optional[UserBasic] = None
    cancelled_reason: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Implementation Attachment schemas
class ImplementationAttachmentBase(BaseModel):
    """Base attachment schema."""
    filename: str
    description: Optional[str] = None
    attachment_type: AttachmentTypeEnum = AttachmentTypeEnum.OTHER


class ImplementationAttachmentResponse(ImplementationAttachmentBase):
    """Schema for attachment response."""
    id: UUID
    implementation_id: UUID
    file_path: str
    file_type: Optional[str] = None
    file_size: int = 0
    uploaded_by: Optional[UserBasic] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Implementation schemas
class ImplementationBase(BaseModel):
    """Base implementation schema."""
    title: str = Field(..., min_length=1, max_length=300)
    description: Optional[str] = None
    start_date: Optional[date] = None
    estimated_end_date: Optional[date] = None
    notes: Optional[str] = None


class ImplementationCreate(ImplementationBase):
    """Schema for creating an implementation."""
    client_id: UUID
    product_id: Optional[UUID] = None
    responsible_user_id: Optional[UUID] = None
    checklist_template_id: Optional[UUID] = None  # Clone items from template


class ImplementationUpdate(BaseModel):
    """Schema for updating an implementation."""
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    description: Optional[str] = None
    product_id: Optional[UUID] = None
    responsible_user_id: Optional[UUID] = None
    status: Optional[ImplementationStatusEnum] = None
    start_date: Optional[date] = None
    estimated_end_date: Optional[date] = None
    actual_end_date: Optional[date] = None
    notes: Optional[str] = None


class ImplementationResponse(ImplementationBase):
    """Schema for implementation response."""
    id: UUID
    client: ClientBasic
    product: Optional[ProductBasic] = None
    responsible_user: Optional[UserBasic] = None
    status: ImplementationStatusEnum
    actual_end_date: Optional[date] = None
    progress_percentage: float = 0.0
    items: List[ImplementationItemResponse] = []
    attachments: List[ImplementationAttachmentResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ImplementationListItem(BaseModel):
    """Schema for implementation list item (simplified)."""
    id: UUID
    title: str
    client: ClientBasic
    product: Optional[ProductBasic] = None
    responsible_user: Optional[UserBasic] = None
    status: ImplementationStatusEnum
    start_date: Optional[date] = None
    estimated_end_date: Optional[date] = None
    progress_percentage: float = 0.0
    created_at: datetime

    class Config:
        from_attributes = True


class ImplementationListResponse(BaseModel):
    """Schema for paginated implementation list."""
    items: List[ImplementationListItem]
    total: int
    page: int
    size: int


# Gantt chart data schema
class GanttItem(BaseModel):
    """Schema for Gantt chart item."""
    id: UUID
    title: str
    category: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: ItemStatusEnum
    progress: float = 0.0
    estimated_hours: int = 0


class GanttResponse(BaseModel):
    """Schema for Gantt chart response."""
    implementation_id: UUID
    title: str
    start_date: Optional[date] = None
    estimated_end_date: Optional[date] = None
    items: List[GanttItem]
