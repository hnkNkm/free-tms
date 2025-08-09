from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.api import deps
from app.models import Client, Project, Employee
from app.schemas.client import (
    Client as ClientSchema,
    ClientCreate,
    ClientUpdate,
    ClientList,
)
from app.api.routes.auth import get_current_user

router = APIRouter()


@router.get("/", response_model=List[ClientList])
def get_clients(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    search: Optional[str] = None,
    db: Session = Depends(deps.get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Get list of clients."""
    query = db.query(
        Client.id,
        Client.name,
        Client.industry,
        Client.contact_person,
        Client.contact_email,
        func.count(Project.id).label("project_count"),
    ).outerjoin(Project).group_by(Client.id)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Client.name.ilike(search_term)) |
            (Client.industry.ilike(search_term)) |
            (Client.contact_person.ilike(search_term))
        )
    
    clients = query.offset(skip).limit(limit).all()
    
    return [ClientList(**dict(c._mapping)) for c in clients]


@router.get("/{client_id}", response_model=ClientSchema)
def get_client(
    client_id: int,
    db: Session = Depends(deps.get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Get client detail."""
    client = db.query(Client).filter(Client.id == client_id).first()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Count projects
    project_count = db.query(func.count(Project.id)).filter(
        Project.client_id == client_id
    ).scalar()
    
    response = ClientSchema.from_orm(client)
    response.project_count = project_count or 0
    
    return response


@router.post("/", response_model=ClientSchema)
def create_client(
    client_in: ClientCreate,
    db: Session = Depends(deps.get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Create new client (admin/manager only)."""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Check if client with same name exists
    existing = db.query(Client).filter(Client.name == client_in.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Client with this name already exists")
    
    client = Client(**client_in.dict())
    db.add(client)
    db.commit()
    db.refresh(client)
    
    response = ClientSchema.from_orm(client)
    response.project_count = 0
    
    return response


@router.put("/{client_id}", response_model=ClientSchema)
def update_client(
    client_id: int,
    client_in: ClientUpdate,
    db: Session = Depends(deps.get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Update client (admin/manager only)."""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Check if new name conflicts with existing client
    if client_in.name and client_in.name != client.name:
        existing = db.query(Client).filter(
            Client.name == client_in.name,
            Client.id != client_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Client with this name already exists")
    
    # Update client fields
    update_data = client_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(client, field, value)
    
    db.commit()
    db.refresh(client)
    
    # Count projects
    project_count = db.query(func.count(Project.id)).filter(
        Project.client_id == client_id
    ).scalar()
    
    response = ClientSchema.from_orm(client)
    response.project_count = project_count or 0
    
    return response


@router.delete("/{client_id}")
def delete_client(
    client_id: int,
    db: Session = Depends(deps.get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Delete client (admin only)."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Check if client has projects
    project_count = db.query(func.count(Project.id)).filter(
        Project.client_id == client_id
    ).scalar()
    
    if project_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete client with {project_count} associated projects"
        )
    
    db.delete(client)
    db.commit()
    
    return {"message": "Client deleted successfully"}