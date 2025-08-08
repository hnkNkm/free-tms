import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.skill import Skill

def seed_skills():
    db = SessionLocal()
    
    # Define initial skills with categories
    initial_skills = [
        # Programming Languages
        {"name": "Python", "category": "プログラミング言語"},
        {"name": "JavaScript", "category": "プログラミング言語"},
        {"name": "TypeScript", "category": "プログラミング言語"},
        {"name": "Java", "category": "プログラミング言語"},
        {"name": "C#", "category": "プログラミング言語"},
        {"name": "Go", "category": "プログラミング言語"},
        {"name": "Rust", "category": "プログラミング言語"},
        {"name": "PHP", "category": "プログラミング言語"},
        {"name": "Ruby", "category": "プログラミング言語"},
        {"name": "Swift", "category": "プログラミング言語"},
        {"name": "Kotlin", "category": "プログラミング言語"},
        
        # Frontend Frameworks
        {"name": "React", "category": "フロントエンド"},
        {"name": "Vue.js", "category": "フロントエンド"},
        {"name": "Angular", "category": "フロントエンド"},
        {"name": "Next.js", "category": "フロントエンド"},
        {"name": "Nuxt.js", "category": "フロントエンド"},
        {"name": "Svelte", "category": "フロントエンド"},
        {"name": "HTML/CSS", "category": "フロントエンド"},
        {"name": "Tailwind CSS", "category": "フロントエンド"},
        {"name": "Material-UI", "category": "フロントエンド"},
        
        # Backend Frameworks
        {"name": "FastAPI", "category": "バックエンド"},
        {"name": "Django", "category": "バックエンド"},
        {"name": "Flask", "category": "バックエンド"},
        {"name": "Express.js", "category": "バックエンド"},
        {"name": "Spring Boot", "category": "バックエンド"},
        {"name": "ASP.NET Core", "category": "バックエンド"},
        {"name": "Ruby on Rails", "category": "バックエンド"},
        {"name": "Laravel", "category": "バックエンド"},
        {"name": "NestJS", "category": "バックエンド"},
        
        # Databases
        {"name": "PostgreSQL", "category": "データベース"},
        {"name": "MySQL", "category": "データベース"},
        {"name": "MongoDB", "category": "データベース"},
        {"name": "Redis", "category": "データベース"},
        {"name": "Elasticsearch", "category": "データベース"},
        {"name": "Oracle", "category": "データベース"},
        {"name": "SQL Server", "category": "データベース"},
        {"name": "DynamoDB", "category": "データベース"},
        {"name": "Cassandra", "category": "データベース"},
        
        # Cloud & Infrastructure
        {"name": "AWS", "category": "クラウド・インフラ"},
        {"name": "Azure", "category": "クラウド・インフラ"},
        {"name": "Google Cloud", "category": "クラウド・インフラ"},
        {"name": "Docker", "category": "クラウド・インフラ"},
        {"name": "Kubernetes", "category": "クラウド・インフラ"},
        {"name": "Terraform", "category": "クラウド・インフラ"},
        {"name": "Jenkins", "category": "クラウド・インフラ"},
        {"name": "GitLab CI/CD", "category": "クラウド・インフラ"},
        {"name": "GitHub Actions", "category": "クラウド・インフラ"},
        
        # Data Science & ML
        {"name": "Machine Learning", "category": "データサイエンス"},
        {"name": "Deep Learning", "category": "データサイエンス"},
        {"name": "TensorFlow", "category": "データサイエンス"},
        {"name": "PyTorch", "category": "データサイエンス"},
        {"name": "Scikit-learn", "category": "データサイエンス"},
        {"name": "Pandas", "category": "データサイエンス"},
        {"name": "NumPy", "category": "データサイエンス"},
        {"name": "Data Analysis", "category": "データサイエンス"},
        {"name": "Statistics", "category": "データサイエンス"},
        
        # Tools & Others
        {"name": "Git", "category": "開発ツール"},
        {"name": "Linux", "category": "開発ツール"},
        {"name": "Agile/Scrum", "category": "マネジメント"},
        {"name": "Project Management", "category": "マネジメント"},
        {"name": "Technical Writing", "category": "その他"},
        {"name": "UI/UX Design", "category": "デザイン"},
        {"name": "Figma", "category": "デザイン"},
        {"name": "Security", "category": "セキュリティ"},
        {"name": "Testing/QA", "category": "品質保証"},
        {"name": "GraphQL", "category": "API"},
        {"name": "REST API", "category": "API"},
        {"name": "gRPC", "category": "API"},
    ]
    
    # Clear existing skills
    print("Clearing existing skills...")
    db.query(Skill).delete()
    db.commit()
    
    # Add new skills
    for skill_data in initial_skills:
        # Check if skill already exists
        existing_skill = db.query(Skill).filter(Skill.name == skill_data["name"]).first()
        if existing_skill:
            print(f"Skill {skill_data['name']} already exists, skipping...")
            continue
        
        skill = Skill(**skill_data)
        db.add(skill)
        print(f"Added skill: {skill_data['name']} ({skill_data['category']})")
    
    db.commit()
    db.close()
    print(f"\nSuccessfully seeded {len(initial_skills)} skills!")

if __name__ == "__main__":
    seed_skills()