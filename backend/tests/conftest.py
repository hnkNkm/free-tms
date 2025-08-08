import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.database import Base, get_db
from main import app
import os

# Use SQLite file DB for testing (shared across tests)
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False)


@pytest.fixture(scope="session")
def setup_db():
    # Ensure all models are imported so tables are registered
    from app.models import employee  # noqa: F401
    from app.models import skill     # noqa: F401
    from app.models import project   # noqa: F401

    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session(setup_db):
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture(scope="function")
def client(db_session):
    # Override the dependency to use the function-scoped transactional session
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def test_user_data():
    return {
        "name": "Test User",
        "email": "test@example.com",
        "password": "testpass123",
        "department": "テスト部",
        "position": "テストエンジニア",
        "role": "employee"
    }


@pytest.fixture
def admin_user_data():
    return {
        "name": "Admin User",
        "email": "admin@example.com",
        "password": "adminpass123",
        "department": "管理部",
        "position": "システム管理者",
        "role": "admin"
    }