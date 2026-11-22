
from datetime import date, datetime, timezone

from sqlalchemy import (
    String,
    Integer,
    DateTime,
    Date,
    Text,
    ForeignKey,
    JSON,
)
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )

    name: Mapped[str] = mapped_column(String(120))

    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True
    )

    password_hash: Mapped[str] = mapped_column(String(255))

    role: Mapped[str] = mapped_column(
        String(20), index=True
    )

    company: Mapped[str | None] = mapped_column(
        String(180), nullable=True
    )

    resume_path: Mapped[str | None] = mapped_column(
        String(500), nullable=True
    )

    resume_filename: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )

    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), index=True
    )

    title: Mapped[str] = mapped_column(String(180))

    company: Mapped[str] = mapped_column(String(180))

    location: Mapped[str] = mapped_column(
        String(180), default="Remote"
    )

    job_type: Mapped[str] = mapped_column(
        String(50), default="Full-time"
    )

    experience: Mapped[str] = mapped_column(
        String(80), default="Entry level"
    )

    description: Mapped[str] = mapped_column(Text)

    required_skills: Mapped[list] = mapped_column(
        JSON, default=list
    )

    mandatory_skills: Mapped[list] = mapped_column(
        JSON, default=list
    )

    deadline: Mapped[date | None] = mapped_column(
        Date, nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )

    student_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), index=True
    )

    job_id: Mapped[int] = mapped_column(
        ForeignKey("jobs.id"), index=True
    )

    status: Mapped[str] = mapped_column(
        String(40), default="Submitted"
    )

    candidate_skills: Mapped[list] = mapped_column(
        JSON, default=list
    )

    matched_skills: Mapped[list] = mapped_column(
        JSON, default=list
    )

    missing_skills: Mapped[list] = mapped_column(
        JSON, default=list
    )

    match_percentage: Mapped[int] = mapped_column(
        Integer, default=0
    )

    resume_name: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )
