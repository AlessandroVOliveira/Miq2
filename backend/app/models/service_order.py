"""SQLAlchemy models for Service Orders."""
import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import Column, String, Text, Integer, DateTime, Boolean, Date, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class ServiceOrderStatus(str, PyEnum):
    """Service order status options."""
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    WAITING_PARTS = "waiting_parts"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ServiceOrderPriority(str, PyEnum):
    """Service order priority levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class ServiceOrderCategory(str, PyEnum):
    """Service order category types."""
    MAINTENANCE = "maintenance"
    INSTALLATION = "installation"
    REPAIR = "repair"
    UPGRADE = "upgrade"
    OTHER = "other"


class ServiceOrderTemplate(Base):
    """Template for service orders."""
    __tablename__ = "service_order_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    category = Column(Enum(ServiceOrderCategory), default=ServiceOrderCategory.MAINTENANCE)
    default_steps = Column(Text, nullable=True)
    estimated_duration_hours = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    service_orders = relationship("ServiceOrder", back_populates="template")

    def __repr__(self):
        return f"<ServiceOrderTemplate {self.name}>"


class ServiceOrder(Base):
    """Service order for hardware maintenance."""
    __tablename__ = "service_orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(300), nullable=False, index=True)
    description = Column(Text, nullable=True)
    
    # Relationships
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False)
    template_id = Column(UUID(as_uuid=True), ForeignKey("service_order_templates.id"), nullable=True)
    assigned_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True)
    
    # Status and priority
    status = Column(Enum(ServiceOrderStatus), default=ServiceOrderStatus.OPEN)
    priority = Column(Enum(ServiceOrderPriority), default=ServiceOrderPriority.MEDIUM)
    
    # Equipment info
    equipment_serial = Column(String(100), nullable=True)
    equipment_description = Column(Text, nullable=True)
    
    # Dates
    opened_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Resolution
    resolution_notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    client = relationship("Client", backref="service_orders")
    template = relationship("ServiceOrderTemplate", back_populates="service_orders")
    assigned_user = relationship("User", foreign_keys=[assigned_user_id], backref="assigned_service_orders")
    team = relationship("Team", backref="service_orders")
    equipment_entries = relationship("EquipmentEntry", back_populates="service_order", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<ServiceOrder {self.title}>"


class EquipmentEntry(Base):
    """Equipment entry/exit tracking."""
    __tablename__ = "equipment_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    service_order_id = Column(UUID(as_uuid=True), ForeignKey("service_orders.id"), nullable=False)
    
    serial_number = Column(String(100), nullable=True, index=True)
    description = Column(Text, nullable=False)
    condition_on_entry = Column(Text, nullable=True)
    condition_on_exit = Column(Text, nullable=True)
    
    entry_date = Column(DateTime, default=datetime.utcnow)
    exit_date = Column(DateTime, nullable=True)
    
    received_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    released_to = Column(String(200), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    service_order = relationship("ServiceOrder", back_populates="equipment_entries")
    received_by = relationship("User", backref="equipment_received")

    def __repr__(self):
        return f"<EquipmentEntry {self.serial_number or self.description[:30]}>"
