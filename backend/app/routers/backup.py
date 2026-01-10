"""Backup router for database backup and restore operations."""
import os
import subprocess
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models import User
from app.middleware.auth import get_current_active_user
from app.services.auth import AuthService

router = APIRouter(prefix="/backup", tags=["Backup"])

# Parse DATABASE_URL for connection info
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://miq2:miq2_secret@db:5432/miq2")
# Format: postgresql://user:password@host:port/dbname
import re
match = re.match(r'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)', DATABASE_URL)
if match:
    DB_USER = match.group(1)
    DB_PASSWORD = match.group(2)
    DB_HOST = match.group(3)
    DB_PORT = match.group(4)
    DB_NAME = match.group(5)
else:
    DB_HOST = "db"
    DB_PORT = "5432"
    DB_NAME = "miq2"
    DB_USER = "miq2"
    DB_PASSWORD = "miq2_secret"

# Backup directory
BACKUP_DIR = "/app/backups"
os.makedirs(BACKUP_DIR, exist_ok=True)


class RestoreRequest(BaseModel):
    """Restore request with admin password."""
    admin_password: str


@router.post("/create")
async def create_backup(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a database backup and return as downloadable file.
    Only superusers can create backups.
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create backups"
        )
    
    # Generate backup filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"miq2_backup_{timestamp}.sql"
    backup_path = os.path.join(BACKUP_DIR, backup_filename)
    
    # Set PGPASSWORD environment variable for pg_dump
    env = os.environ.copy()
    env["PGPASSWORD"] = DB_PASSWORD
    
    try:
        # Execute pg_dump - using custom format for better restore control
        result = subprocess.run(
            [
                "pg_dump",
                "-h", DB_HOST,
                "-p", DB_PORT,
                "-U", DB_USER,
                "-d", DB_NAME,
                "-f", backup_path,
                "--clean",
                "--if-exists"
            ],
            env=env,
            capture_output=True,
            text=True,
            timeout=300  # 5 minutes timeout
        )
        
        if result.returncode != 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Backup failed: {result.stderr}"
            )
        
        # Return file as streaming response
        def iterfile():
            with open(backup_path, "rb") as f:
                yield from f
            # Clean up after sending
            try:
                os.remove(backup_path)
            except:
                pass
        
        return StreamingResponse(
            iterfile(),
            media_type="application/sql",
            headers={
                "Content-Disposition": f"attachment; filename={backup_filename}"
            }
        )
        
    except subprocess.TimeoutExpired:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Backup operation timed out"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Backup failed: {str(e)}"
        )


@router.post("/restore")
async def restore_backup(
    file: UploadFile = File(...),
    admin_password: str = Form(...),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Restore database from a backup file.
    Requires admin password for confirmation.
    Only superusers can restore backups.
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can restore backups"
        )
    
    # Verify admin password
    if not AuthService.verify_password(admin_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid administrator password"
        )
    
    # Validate file extension
    if not file.filename or not file.filename.endswith('.sql'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid backup file. Must be a .sql file"
        )
    
    # Save uploaded file temporarily
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    restore_filename = f"restore_{timestamp}.sql"
    restore_path = os.path.join(BACKUP_DIR, restore_filename)
    
    # Save uploaded file
    with open(restore_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    # Set PGPASSWORD environment variable for psql
    env = os.environ.copy()
    env["PGPASSWORD"] = DB_PASSWORD
    
    # Execute psql in background using Popen (non-blocking)
    subprocess.Popen(
        [
            "psql",
            "-h", DB_HOST,
            "-p", DB_PORT,
            "-U", DB_USER,
            "-d", DB_NAME,
            "-f", restore_path
        ],
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        stdin=subprocess.DEVNULL
    )
    
    return {
        "message": "Database restore started. Please wait a few seconds and refresh the page.",
        "filename": file.filename,
        "started_at": datetime.now().isoformat()
    }

