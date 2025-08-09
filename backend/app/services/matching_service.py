from typing import List, Dict, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from datetime import datetime, timedelta
import logging

from app.models.employee import Employee
from app.models.project import Project, ProjectStatus, ProjectSkill, ProjectMember
from app.models.skill import Skill, EmployeeSkill

logger = logging.getLogger(__name__)


class MatchingService:
    def __init__(self, db: Session):
        self.db = db

    def calculate_skill_match_score(
        self, 
        employee_skills: List[EmployeeSkill], 
        project_skills: List[ProjectSkill]
    ) -> float:
        if not project_skills:
            return 0.0
        
        total_score = 0.0
        matched_skills = 0
        
        employee_skill_dict = {
            es.skill_id: es.proficiency_level 
            for es in employee_skills
        }
        
        for ps in project_skills:
            if ps.skill_id in employee_skill_dict:
                employee_level = employee_skill_dict[ps.skill_id]
                required_level = ps.required_proficiency_level or 1
                
                if employee_level >= required_level:
                    level_bonus = min(employee_level / required_level, 2.0)
                    total_score += level_bonus
                    matched_skills += 1
                else:
                    partial_score = employee_level / required_level
                    total_score += partial_score * 0.5
                    matched_skills += 0.5
        
        if len(project_skills) > 0:
            match_rate = matched_skills / len(project_skills)
            normalized_score = (total_score / len(project_skills)) * match_rate
            return min(normalized_score * 100, 100)
        
        return 0.0

    def calculate_experience_score(
        self, 
        employee: Employee, 
        project: Project,
        past_projects: List[ProjectMember]
    ) -> float:
        score = 0.0
        
        if project.client_id:
            client_projects = [
                pm for pm in past_projects 
                if pm.project.client_id == project.client_id
            ]
            if client_projects:
                score += 20.0
                
                for pm in client_projects[:3]:
                    if pm.contribution_level:
                        score += pm.contribution_level * 2
        
        similar_projects = []
        if project.technologies:
            project_tech = set(project.technologies.lower().split(','))
            for pm in past_projects:
                if pm.project.technologies:
                    past_tech = set(pm.project.technologies.lower().split(','))
                    overlap = len(project_tech & past_tech)
                    if overlap > 0:
                        similar_projects.append((pm, overlap))
        
        if similar_projects:
            similar_projects.sort(key=lambda x: x[1], reverse=True)
            for pm, overlap in similar_projects[:3]:
                score += overlap * 5
        
        if past_projects:
            recent_projects = [
                pm for pm in past_projects 
                if pm.project.end_date and 
                pm.project.end_date >= datetime.now().date() - timedelta(days=365)
            ]
            if recent_projects:
                score += min(len(recent_projects) * 3, 15)
        
        return min(score, 100)

    def calculate_availability_score(
        self, 
        employee: Employee,
        current_projects: List[ProjectMember]
    ) -> float:
        active_projects = [
            pm for pm in current_projects
            if pm.project.status in [ProjectStatus.IN_PROGRESS, ProjectStatus.PLANNING]
        ]
        
        if not active_projects:
            return 100.0
        elif len(active_projects) == 1:
            return 50.0
        elif len(active_projects) == 2:
            return 20.0
        else:
            return 0.0

    def get_project_recommendations(
        self,
        project_id: int,
        limit: int = 10,
        min_score: float = 30.0
    ) -> List[Dict]:
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError(f"Project {project_id} not found")
        
        project_skills = self.db.query(ProjectSkill).filter(
            ProjectSkill.project_id == project_id
        ).all()
        
        current_member_ids = self.db.query(ProjectMember.employee_id).filter(
            ProjectMember.project_id == project_id
        ).subquery()
        
        employees = self.db.query(Employee).filter(
            and_(
                Employee.is_active == True,
                ~Employee.id.in_(current_member_ids)
            )
        ).all()
        
        recommendations = []
        
        for employee in employees:
            employee_skills = self.db.query(EmployeeSkill).filter(
                EmployeeSkill.employee_id == employee.id
            ).all()
            
            skill_score = self.calculate_skill_match_score(
                employee_skills, project_skills
            )
            
            if skill_score < min_score:
                continue
            
            past_projects = self.db.query(ProjectMember).filter(
                ProjectMember.employee_id == employee.id
            ).join(Project).all()
            
            experience_score = self.calculate_experience_score(
                employee, project, past_projects
            )
            
            current_projects = [
                pm for pm in past_projects 
                if pm.project.status in [ProjectStatus.IN_PROGRESS, ProjectStatus.PLANNING]
            ]
            availability_score = self.calculate_availability_score(
                employee, current_projects
            )
            
            total_score = (
                skill_score * 0.5 + 
                experience_score * 0.3 + 
                availability_score * 0.2
            )
            
            matched_skills = []
            for es in employee_skills:
                for ps in project_skills:
                    if es.skill_id == ps.skill_id:
                        skill = self.db.query(Skill).filter(
                            Skill.id == es.skill_id
                        ).first()
                        if skill:
                            matched_skills.append({
                                "name": skill.name,
                                "employee_level": es.proficiency_level,
                                "required_level": ps.required_proficiency_level or 1
                            })
            
            recommendations.append({
                "employee": {
                    "id": employee.id,
                    "name": employee.name,
                    "email": employee.email,
                    "department": employee.department,
                    "position": employee.position
                },
                "scores": {
                    "total": round(total_score, 1),
                    "skill_match": round(skill_score, 1),
                    "experience": round(experience_score, 1),
                    "availability": round(availability_score, 1)
                },
                "matched_skills": matched_skills,
                "past_client_projects": len([
                    pm for pm in past_projects 
                    if pm.project.client_id == project.client_id
                ]) if project.client_id else 0,
                "total_projects": len(past_projects)
            })
        
        recommendations.sort(key=lambda x: x["scores"]["total"], reverse=True)
        
        return recommendations[:limit]

    def bulk_match_employees(
        self,
        project_id: int,
        skill_weight: float = 0.5,
        experience_weight: float = 0.3,
        availability_weight: float = 0.2
    ) -> Dict:
        if not (0 <= skill_weight <= 1 and 0 <= experience_weight <= 1 and 
                0 <= availability_weight <= 1):
            raise ValueError("Weights must be between 0 and 1")
        
        total_weight = skill_weight + experience_weight + availability_weight
        if abs(total_weight - 1.0) > 0.01:
            skill_weight /= total_weight
            experience_weight /= total_weight
            availability_weight /= total_weight
        
        recommendations = self.get_project_recommendations(
            project_id, limit=50, min_score=0
        )
        
        for rec in recommendations:
            rec["scores"]["total"] = round(
                rec["scores"]["skill_match"] * skill_weight +
                rec["scores"]["experience"] * experience_weight +
                rec["scores"]["availability"] * availability_weight,
                1
            )
        
        recommendations.sort(key=lambda x: x["scores"]["total"], reverse=True)
        
        categorized = {
            "excellent": [],
            "good": [],
            "fair": [],
            "poor": []
        }
        
        for rec in recommendations:
            score = rec["scores"]["total"]
            if score >= 70:
                categorized["excellent"].append(rec)
            elif score >= 50:
                categorized["good"].append(rec)
            elif score >= 30:
                categorized["fair"].append(rec)
            else:
                categorized["poor"].append(rec)
        
        project = self.db.query(Project).filter(Project.id == project_id).first()
        required_skills = self.db.query(Skill).join(ProjectSkill).filter(
            ProjectSkill.project_id == project_id
        ).all()
        
        return {
            "project": {
                "id": project.id,
                "name": project.name,
                "required_skills": [
                    {"id": s.id, "name": s.name} for s in required_skills
                ]
            },
            "summary": {
                "total_candidates": len(recommendations),
                "excellent_matches": len(categorized["excellent"]),
                "good_matches": len(categorized["good"]),
                "fair_matches": len(categorized["fair"]),
                "poor_matches": len(categorized["poor"])
            },
            "categorized_recommendations": categorized,
            "weights_used": {
                "skill": skill_weight,
                "experience": experience_weight,
                "availability": availability_weight
            }
        }