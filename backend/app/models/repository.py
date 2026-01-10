"""SQLAlchemy models for Repository/GED (Document Management)."""
import uuid
from datetime import datetime

from sqlalchemy import Column, String, Text, DateTime, Boolean, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class FileCategory(Base):
    """Category for organizing files in repository."""
    __tablename__ = "file_categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)
    
    # Hierarchical categories
    parent_id = Column(UUID(as_uuid=True), ForeignKey("file_categories.id"), nullable=True)
    
    # Optional team restriction
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    parent = relationship("FileCategory", remote_side=[id], backref="children")
    team = relationship("Team", backref="file_categories")
    files = relationship("RepositoryFile", back_populates="category")

    def __repr__(self):
        return f"<FileCategory {self.name}>"


class RepositoryFile(Base):
    """File stored in the repository."""
    __tablename__ = "repository_files"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # File info
    filename = Column(String(255), nullable=False, index=True)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)  # bytes
    mime_type = Column(String(100), nullable=True)
    
    # Organization
    category_id = Column(UUID(as_uuid=True), ForeignKey("file_categories.id"), nullable=True)
    description = Column(Text, nullable=True)
    tags = Column(String(500), nullable=True)  # comma-separated
    
    # Versioning
    version = Column(Integer, default=1)
    previous_version_id = Column(UUID(as_uuid=True), ForeignKey("repository_files.id"), nullable=True)
    
    # Access control
    uploaded_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    is_public = Column(Boolean, default=True)  # accessible by all users
    
    # Stats
    download_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    category = relationship("FileCategory", back_populates="files")
    uploaded_by = relationship("User", backref="uploaded_files")
    previous_version = relationship("RepositoryFile", remote_side=[id])

    def __repr__(self):
        return f"<RepositoryFile {self.filename}>"
