# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Free TMS (タレントマネジメントシステム) is a talent management system designed to centrally manage employee experience, skills, customer relationships, and areas of interest, with search and visualization capabilities.

## Tech Stack

- **Backend**: Python 3.12 + FastAPI + PostgreSQL + Elasticsearch
  - Package management: uv
  - ORM: SQLAlchemy with Alembic for migrations
  - Authentication: JWT (python-jose)
  - ML/Statistics: pandas, numpy, scikit-learn, scipy, networkx
- **Frontend**: React + TypeScript + Vite + TailwindCSS
  - UI Components: shadcn/ui (to be integrated)
  - State management: Zustand or TanStack Query (planned)
- **Infrastructure**: Docker + AWS (production)

## Development Commands

### Backend Development
```bash
cd backend
# Install dependencies
uv sync

# Run development server
uv run uvicorn main:app --reload

# Run with Docker
docker-compose up backend

# Database migrations
uv run alembic upgrade head              # Apply migrations
uv run alembic revision --autogenerate -m "description"  # Create new migration

# Run tests (when implemented)
uv run pytest
```

### Frontend Development
```bash
cd frontend
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

### Docker Operations
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f [service_name]

# Rebuild specific service
docker-compose build [service_name]

# Stop all services
docker-compose down
```

## Architecture Overview

### Backend Structure
- `app/api/`: API endpoints organized by domain (auth, employees, jobs, etc.)
- `app/core/`: Core utilities (config, security, dependencies)
- `app/db/`: Database connection and base configuration
- `app/models/`: SQLAlchemy models representing database tables
- `app/schemas/`: Pydantic models for request/response validation
- `app/services/`: Business logic layer (to be implemented)
- `alembic/`: Database migration files

Key architectural decisions:
- FastAPI router structure with versioned API (`/api/v1/`)
- JWT-based authentication with role-based access control (RBAC)
- Elasticsearch for full-text search on employee profiles
- Machine learning models for job matching and skill analysis

### Frontend Structure (to be developed)
- `src/components/`: Reusable UI components
- `src/pages/`: Page-level components
- `src/hooks/`: Custom React hooks
- `src/services/`: API client services
- `src/lib/`: Utility functions

### Database Schema
Main entities:
- Employee: User accounts with profiles, skills, and preferences
- Project: Historical project records
- Job: New job opportunities for matching
- Client: Customer information
- Skill: Skill catalog with employee relationships
- JobInvitation: Tracking job invitations and responses

### Key Features
1. **Employee Profile Management**: Self-editable profiles with interests and career goals
2. **Full-text Search**: Search across employee profiles, skills, and project descriptions
3. **Job Matching**: AI-powered matching using:
   - Skill vector similarity (cosine similarity)
   - Past project experience analysis
   - Customer relationship scoring
   - Natural language processing on profiles
4. **Analytics & Visualization**: Skill maps, network graphs, team optimization
5. **Email Invitations**: Bulk invitation system with template management

## Environment Setup

1. Copy `.env.example` to `.env` and configure:
   - Database credentials
   - Secret keys
   - Elasticsearch URL
   - Email settings (for production)

2. Ensure Docker is running for PostgreSQL and Elasticsearch

3. Run initial database migrations before first use

## API Documentation

When backend is running, access:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Important Notes

- Always use `uv` for Python dependency management in backend
- Database migrations should be reviewed before applying in production
- The system uses PostgreSQL full-text search as fallback if Elasticsearch is unavailable
- Role-based permissions: Employee < Manager < Admin
- All employee data is considered sensitive - ensure proper access controls