"""Implementation models for managing ERP deployments."""
import uuid
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import Column, String, Text, Boolean, DateTime, Integer, Date, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class ImplementationStatus(str, PyEnum):
    """Status options for implementation."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ItemStatus(str, PyEnum):
    """Status options for implementation items."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class AttachmentType(str, PyEnum):
    """Types of implementation attachments."""
    ACCEPTANCE_TERM = "acceptance_term"
    INITIAL_REPORT = "initial_report"
    FINAL_REPORT = "final_report"
    OTHER = "other"


class Implementation(Base):
    """Implementation model - represents an ERP deployment for a client."""
    __tablename__ = "implementations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    responsible_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(ImplementationStatus), default=ImplementationStatus.PENDING, nullable=False)
    
    start_date = Column(Date, nullable=True)
    estimated_end_date = Column(Date, nullable=True)
    actual_end_date = Column(Date, nullable=True)
    
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    client = relationship("Client", backref="implementations")
    product = relationship("Product", back_populates="implementations")
    responsible_user = relationship("User", backref="implementations")
    items = relationship("ImplementationItem", back_populates="implementation", cascade="all, delete-orphan", order_by="ImplementationItem.order")
    attachments = relationship("ImplementationAttachment", back_populates="implementation", cascade="all, delete-orphan")

    @property
    def progress_percentage(self) -> float:
        """Calculate completion percentage based on completed items (excluding cancelled)."""
        active_items = [item for item in self.items if item.status != ItemStatus.CANCELLED]
        if not active_items:
            return 0.0
        completed = sum(1 for item in active_items if item.status == ItemStatus.COMPLETED)
        return round((completed / len(active_items)) * 100, 1)

    def __repr__(self):
        return f"<Implementation {self.title}>"


class ImplementationItem(Base):
    """Individual checklist item for an implementation."""
    __tablename__ = "implementation_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    implementation_id = Column(UUID(as_uuid=True), ForeignKey("implementations.id", ondelete="CASCADE"), nullable=False)
    checklist_item_id = Column(UUID(as_uuid=True), ForeignKey("checklist_items.id", ondelete="SET NULL"), nullable=True)
    
    category = Column(String(100), nullable=True)
    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(ItemStatus), default=ItemStatus.PENDING, nullable=False)
    order = Column(Integer, default=0)
    
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    estimated_hours = Column(Integer, default=0)
    
    completed_at = Column(DateTime, nullable=True)
    completed_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    cancelled_at = Column(DateTime, nullable=True)
    cancelled_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    cancelled_reason = Column(Text, nullable=True)
    
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    implementation = relationship("Implementation", back_populates="items")
    checklist_item = relationship("ChecklistItem")
    completed_by = relationship("User", foreign_keys=[completed_by_id])
    cancelled_by = relationship("User", foreign_keys=[cancelled_by_id])

    def __repr__(self):
        return f"<ImplementationItem {self.title}>"


class ImplementationAttachment(Base):
    """Attachment for an implementation (terms, reports, etc.)."""
    __tablename__ = "implementation_attachments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    implementation_id = Column(UUID(as_uuid=True), ForeignKey("implementations.id", ondelete="CASCADE"), nullable=False)
    uploaded_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(100), nullable=True)
    file_size = Column(Integer, default=0)
    
    description = Column(Text, nullable=True)
    attachment_type = Column(Enum(AttachmentType), default=AttachmentType.OTHER, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    implementation = relationship("Implementation", back_populates="attachments")
    uploaded_by = relationship("User")

    def __repr__(self):
        return f"<ImplementationAttachment {self.filename}>"
