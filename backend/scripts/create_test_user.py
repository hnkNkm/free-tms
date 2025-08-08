import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.db.database import SessionLocal, engine
from app.models.employee import Employee, Role
from app.core.security import get_password_hash
from datetime import datetime

def create_test_users():
    db = SessionLocal()
    
    # Test users data
    test_users = [
        {
            "name": "管理者テスト",
            "email": "admin@test.com",
            "password": "admin123",
            "role": Role.ADMIN,
            "department": "システム部",
            "position": "システム管理者"
        },
        {
            "name": "マネージャーテスト",
            "email": "manager@test.com",
            "password": "manager123",
            "role": Role.MANAGER,
            "department": "開発部",
            "position": "プロジェクトマネージャー"
        },
        {
            "name": "社員テスト",
            "email": "employee@test.com",
            "password": "employee123",
            "role": Role.EMPLOYEE,
            "department": "開発部",
            "position": "エンジニア"
        }
    ]
    
    for user_data in test_users:
        # Check if user already exists
        existing_user = db.query(Employee).filter(Employee.email == user_data["email"]).first()
        if existing_user:
            print(f"User {user_data['email']} already exists, skipping...")
            continue
        
        # Create new user
        user = Employee(
            name=user_data["name"],
            email=user_data["email"],
            password_hash=get_password_hash(user_data["password"]),
            role=user_data["role"],
            department=user_data["department"],
            position=user_data["position"],
            joined_date=datetime.now(),
            is_active=True
        )
        db.add(user)
        print(f"Created user: {user_data['email']} with password: {user_data['password']}")
    
    db.commit()
    db.close()
    print("Test users created successfully!")

if __name__ == "__main__":
    create_test_users()