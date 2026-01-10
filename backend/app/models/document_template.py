"""Document Template models for managing document templates."""
import uuid
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, Table, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class TemplateType(str, PyEnum):
    """Types of document templates."""
    OPENING_TERM = "opening_term"       # Termo de Abertura
    CLOSING_TERM = "closing_term"       # Termo de Encerramento
    PROGRESS_REPORT = "progress_report" # Relatório de Progresso
    OTHER = "other"


# Association table for many-to-many relationship between templates and products
template_products = Table(
    "template_products",
    Base.metadata,
    Column("template_id", UUID(as_uuid=True), ForeignKey("document_templates.id", ondelete="CASCADE"), primary_key=True),
    Column("product_id", UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), primary_key=True)
)


class DocumentTemplate(Base):
    """Document Template model - stores template metadata and file reference."""
    __tablename__ = "document_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    template_type = Column(String(50), default=TemplateType.OTHER.value, nullable=False)
    
    # File storage
    file_path = Column(String(500), nullable=False)  # Path to the .docx file
    original_filename = Column(String(255), nullable=False)  # Original uploaded filename
    
    # Detected placeholders from the template
    placeholders = Column(JSON, default=list)  # List of placeholder names found in template
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Many-to-many relationship with products
    products = relationship(
        "Product",
        secondary=template_products,
        backref="document_templates"
    )

    def __repr__(self):
        return f"<DocumentTemplate {self.name}>"
