from fastapi import APIRouter
from app.api.routes import auth, employees, skills, projects, clients

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(employees.router, prefix="/employees", tags=["employees"])
api_router.include_router(skills.router, prefix="/skills", tags=["skills"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(clients.router, prefix="/clients", tags=["clients"])