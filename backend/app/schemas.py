
from datetime import date
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, ConfigDict


# --------------------------------------------------
# AUTHENTICATION
# --------------------------------------------------

class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: Literal["student", "recruiter"]
    company: str | None = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    company: str | None = None

    model_config = ConfigDict(from_attributes=True)


# --------------------------------------------------
# JOBS
# --------------------------------------------------

class JobCreate(BaseModel):
    title: str = Field(min_length=2, max_length=180)
    company: str = Field(min_length=2, max_length=180)
    location: str = "Remote"
    job_type: str = "Full-time"
    experience: str = "Entry level"
    description: str = Field(min_length=10)
    required_skills: list[str] = Field(min_length=1)
    mandatory_skills: list[str] = Field(default_factory=list)
    deadline: date | None = None


class JobUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=180)
    company: str | None = Field(default=None, min_length=2, max_length=180)
    location: str | None = None
    job_type: str | None = None
    experience: str | None = None
    description: str | None = Field(default=None, min_length=10)
    required_skills: list[str] | None = None
    mandatory_skills: list[str] | None = None
    deadline: date | None = None


class JobOut(BaseModel):
    id: int
    owner_id: int
    title: str
    company: str
    location: str
    job_type: str
    experience: str
    description: str
    required_skills: list[str]
    mandatory_skills: list[str]
    deadline: date | None = None

    model_config = ConfigDict(from_attributes=True)


# --------------------------------------------------
# SKILL MATCHING
# --------------------------------------------------

class MatchIn(BaseModel):
    job_id: int
    candidate_skills: list[str] = Field(default_factory=list)


# --------------------------------------------------
# INTERVIEW PREPARATION
# --------------------------------------------------

class QuestionsIn(BaseModel):
    skills: list[str] = Field(default_factory=list)
    count: int = Field(default=8, ge=5, le=10)


class PdfIn(BaseModel):
    job_title: str = "Interview Preparation"
    missing_skills: list[str] = Field(default_factory=list)
    questions: list[dict] = Field(default_factory=list)


# --------------------------------------------------
# JOB APPLICATIONS
# --------------------------------------------------

class ApplicationIn(BaseModel):
    job_id: int
    candidate_skills: list[str] = Field(min_length=1)


class StatusIn(BaseModel):
    status: Literal[
        "Submitted",
        "Under Review",
        "Shortlisted",
        "Interview",
        "Rejected",
        "Accepted",
    ]
