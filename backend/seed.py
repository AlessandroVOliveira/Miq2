"""
Seed script to create initial data for Miq2.
Runs automatically on first startup.
"""
import sys
import os
sys.path.insert(0, '.')

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models import User, Team, Role, Permission
from app.services.auth import AuthService

# Create all tables
Base.metadata.create_all(bind=engine)


def create_permissions(db: Session) -> dict:
    """Create all base permissions for the system."""
    resources = [
        'users', 'teams', 'roles', 'permissions', 'clients', 'products', 
        'checklists', 'implementations', 'service-orders', 'tasks',
        'sprints', 'repository', 'dashboard', 'backup', 'templates', 
        'chat', 'chat-config', 'powerbi'
    ]
    actions = ['create', 'read', 'update', 'delete']
    
    permissions = {}
    
    for resource in resources:
        for action in actions:
            existing = db.query(Permission).filter(
                Permission.resource == resource,
                Permission.action == action
            ).first()
            
            if existing:
                permissions[f"{resource}:{action}"] = existing
            else:
                perm = Permission(
                    resource=resource,
                    action=action,
                    description=f"Permite {action} em {resource}"
                )
                db.add(perm)
                permissions[f"{resource}:{action}"] = perm
                print(f"  + Created permission {resource}:{action}")
    
    db.commit()
    return permissions


def create_admin_role(db: Session, permissions: dict) -> Role:
    """Create admin role with all permissions."""
    role = db.query(Role).filter(Role.name == "Administrador").first()
    if role:
        return role
    
    role = Role(name="Administrador", description="Acesso total ao sistema")
    db.add(role)
    db.flush()
    
    for perm in permissions.values():
        role.permissions.append(perm)
    
    db.commit()
    print("  + Created role 'Administrador'")
    return role


def create_operator_role(db: Session, permissions: dict) -> Role:
    """Create operator role with limited permissions."""
    role = db.query(Role).filter(Role.name == "Operador").first()
    if role:
        return role
    
    role = Role(name="Operador", description="Acesso de leitura e operações básicas")
    db.add(role)
    db.flush()
    
    read_perms = [
        'users:read', 'teams:read', 'roles:read', 'clients:read', 'clients:update',
        'products:read', 'checklists:read', 'implementations:read', 'implementations:update',
        'service-orders:read', 'service-orders:update', 'tasks:read', 'tasks:update', 'tasks:create',
        'sprints:read', 'repository:read', 'dashboard:read', 'templates:read',
        'chat:read', 'chat:create', 'chat:update',
        'chat-config:read', 'powerbi:read'
    ]
    for perm_name in read_perms:
        if perm_name in permissions:
            role.permissions.append(permissions[perm_name])
    
    db.commit()
    print("  + Created role 'Operador'")
    return role


def create_superuser(db: Session, admin_role: Role) -> User:
    """Create the initial superuser."""
    email = "admin@miq2.com"
    
    user = db.query(User).filter(User.email == email).first()
    if user:
        return user
    
    user = User(
        email=email,
        name="Administrador",
        password_hash=AuthService.hash_password(os.getenv("ADMIN_PASSWORD", "admin123")),
        is_active=True,
        is_superuser=True
    )
    db.add(user)
    db.flush()
    user.roles.append(admin_role)
    db.commit()
    print(f"  + Created superuser '{email}'")
    return user


def create_teams(db: Session) -> list:
    """Create initial teams."""
    teams_data = [
        ("Suporte", "Equipe de suporte técnico"),
        ("Implantação", "Equipe de implantação de sistemas"),
        ("Comercial", "Equipe comercial e vendas"),
    ]
    
    teams = []
    for name, description in teams_data:
        team = db.query(Team).filter(Team.name == name).first()
        if not team:
            team = Team(name=name, description=description)
            db.add(team)
            print(f"  + Created team '{name}'")
        teams.append(team)
    
    db.commit()
    return teams


def run_seed():
    """Main seed function."""
    print("\n=== Miq2 Database Seed ===\n")
    
    db = SessionLocal()
    
    try:
        print("Creating permissions...")
        permissions = create_permissions(db)
        
        print("Creating roles...")
        admin_role = create_admin_role(db, permissions)
        create_operator_role(db, permissions)
        
        print("Creating superuser...")
        create_superuser(db, admin_role)
        
        print("Creating teams...")
        create_teams(db)
        
        print("\n=== Seed completed! ===")
        print("\nDefault credentials:")
        print("  Email: admin@miq2.com")
        print(f"  Password: {os.getenv('ADMIN_PASSWORD', 'admin123')}\n")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
