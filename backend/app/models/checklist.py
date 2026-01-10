"""Checklist models for implementation templates."""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class ChecklistTemplate(Base):
    """Checklist template model - reusable checklist for implementations."""
    __tablename__ = "checklist_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    version = Column(String(50), default="1.0")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    items = relationship("ChecklistItem", back_populates="template", cascade="all, delete-orphan", order_by="ChecklistItem.order")
    products = relationship("ProductChecklist", back_populates="template")

    def __repr__(self):
        return f"<ChecklistTemplate {self.name}>"


class ChecklistItem(Base):
    """Individual item in a checklist template."""
    __tablename__ = "checklist_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id = Column(UUID(as_uuid=True), ForeignKey("checklist_templates.id", ondelete="CASCADE"), nullable=False)
    category = Column(String(100), nullable=True, index=True)
    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=True)
    order = Column(Integer, default=0)
    estimated_hours = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    template = relationship("ChecklistTemplate", back_populates="items")

    def __repr__(self):
        return f"<ChecklistItem {self.title}>"


class ProductChecklist(Base):
    """Association between Product and ChecklistTemplate."""
    __tablename__ = "product_checklists"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    template_id = Column(UUID(as_uuid=True), ForeignKey("checklist_templates.id", ondelete="CASCADE"), nullable=False)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    product = relationship("Product", back_populates="checklists")
    template = relationship("ChecklistTemplate", back_populates="products")

    def __repr__(self):
        return f"<ProductChecklist product={self.product_id} template={self.template_id}>"
