"""Pydantic schemas for Service Orders."""
from datetime import datetime, date
from typing import Optional, List
from uuid import UUID
from enum import Enum
from pydantic import BaseModel, Field


class ServiceOrderStatusEnum(str, Enum):
    """Service order status options."""
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    WAITING_PARTS = "waiting_parts"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ServiceOrderPriorityEnum(str, Enum):
    """Service order priority levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class ServiceOrderCategoryEnum(str, Enum):
    """Service order category types."""
    MAINTENANCE = "maintenance"
    INSTALLATION = "installation"
    REPAIR = "repair"
    UPGRADE = "upgrade"
    OTHER = "other"


# Basic schemas for nested responses
class ClientBasic(BaseModel):
    id: UUID
    company_name: str

    class Config:
        from_attributes = True


class UserBasic(BaseModel):
    id: UUID
    name: str

    class Config:
        from_attributes = True


class TeamBasic(BaseModel):
    id: UUID
    name: str

    class Config:
        from_attributes = True


# Service Order Template schemas
class ServiceOrderTemplateBase(BaseModel):
    """Base template schema."""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    category: ServiceOrderCategoryEnum = ServiceOrderCategoryEnum.MAINTENANCE
    default_steps: Optional[str] = None
    estimated_duration_hours: int = 1


class ServiceOrderTemplateCreate(ServiceOrderTemplateBase):
    """Create template schema."""
    pass


class ServiceOrderTemplateUpdate(BaseModel):
    """Update template schema."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    category: Optional[ServiceOrderCategoryEnum] = None
    default_steps: Optional[str] = None
    estimated_duration_hours: Optional[int] = None
    is_active: Optional[bool] = None


class ServiceOrderTemplateResponse(ServiceOrderTemplateBase):
    """Template response schema."""
    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Equipment Entry schemas
class EquipmentEntryBase(BaseModel):
    """Base equipment entry schema."""
    serial_number: Optional[str] = None
    description: str
    condition_on_entry: Optional[str] = None


class EquipmentEntryCreate(EquipmentEntryBase):
    """Create equipment entry schema."""
    pass


class EquipmentEntryUpdate(BaseModel):
    """Update equipment entry schema."""
    condition_on_exit: Optional[str] = None
    exit_date: Optional[datetime] = None
    released_to: Optional[str] = None


class EquipmentEntryResponse(EquipmentEntryBase):
    """Equipment entry response schema."""
    id: UUID
    service_order_id: UUID
    condition_on_exit: Optional[str] = None
    entry_date: datetime
    exit_date: Optional[datetime] = None
    received_by: Optional[UserBasic] = None
    released_to: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Service Order schemas
class ServiceOrderBase(BaseModel):
    """Base service order schema."""
    title: str = Field(..., min_length=1, max_length=300)
    description: Optional[str] = None
    equipment_serial: Optional[str] = None
    equipment_description: Optional[str] = None


class ServiceOrderCreate(ServiceOrderBase):
    """Create service order schema."""
    client_id: UUID
    template_id: Optional[UUID] = None
    assigned_user_id: Optional[UUID] = None
    team_id: Optional[UUID] = None
    priority: ServiceOrderPriorityEnum = ServiceOrderPriorityEnum.MEDIUM


class ServiceOrderUpdate(BaseModel):
    """Update service order schema."""
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    description: Optional[str] = None
    assigned_user_id: Optional[UUID] = None
    team_id: Optional[UUID] = None
    status: Optional[ServiceOrderStatusEnum] = None
    priority: Optional[ServiceOrderPriorityEnum] = None
    equipment_serial: Optional[str] = None
    equipment_description: Optional[str] = None
    resolution_notes: Optional[str] = None


class ServiceOrderResponse(ServiceOrderBase):
    """Service order response schema."""
    id: UUID
    client: ClientBasic
    template: Optional[ServiceOrderTemplateResponse] = None
    assigned_user: Optional[UserBasic] = None
    team: Optional[TeamBasic] = None
    status: ServiceOrderStatusEnum
    priority: ServiceOrderPriorityEnum
    opened_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None
    equipment_entries: List[EquipmentEntryResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ServiceOrderListItem(BaseModel):
    """Service order list item schema."""
    id: UUID
    title: str
    client: ClientBasic
    assigned_user: Optional[UserBasic] = None
    status: ServiceOrderStatusEnum
    priority: ServiceOrderPriorityEnum
    opened_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class ServiceOrderListResponse(BaseModel):
    """Paginated service order list."""
    items: List[ServiceOrderListItem]
    total: int
    page: int
    size: int


class ServiceOrderTemplateListResponse(BaseModel):
    """Paginated template list."""
    items: List[ServiceOrderTemplateResponse]
    total: int
    page: int
    size: int
