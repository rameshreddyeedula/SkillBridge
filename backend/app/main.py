
import os
import uuid
from pathlib import Path
from io import BytesIO

from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    UploadFile,
    File,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import select

from .database import Base, engine, get_db
from .models import User, Job, Application
from .schemas import (
    RegisterIn,
    UserOut,
    JobCreate,
    JobOut,
    MatchIn,
    QuestionsIn,
    PdfIn,
    ApplicationIn,
    StatusIn,
)
from .security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_token,
)
from .resume_parser import extract_text, extract_skills
from .skill_matcher import calculate_match
from .interview_ai import generate_questions
from .pdf_generator import build_study_pdf
from .mentor_ai import prepare_study_guide, chat_with_mentor


Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SkillBridge API",
    description="AI-powered student and job matching platform",
    version="1.0.0",
)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://skill-bridge-4lfeewej6-skill-bridge-2aca.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads")).resolve()
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "5"))

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".docx",
    ".txt",
}

APPLICATION_STATUSES = {
    "Submitted",
    "Under Review",
    "Shortlisted",
    "Interview",
    "Rejected",
    "Accepted",
}


# --------------------------------------------------
# AUTHENTICATION HELPERS
# --------------------------------------------------

def current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user_id = decode_token(token)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user = db.get(User, int(user_id))

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user


def require_role(role: str):
    def role_checker(
        user: User = Depends(current_user),
    ):
        if user.role != role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires the {role} role",
            )

        return user

    return role_checker


def get_owned_job(
    job_id: int,
    user: User,
    db: Session,
):
    job = db.get(Job, job_id)

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    if job.owner_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot manage this job",
        )

    return job


# --------------------------------------------------
# RESPONSE HELPERS
# --------------------------------------------------

def application_dict(
    application: Application,
    db: Session,
):
    job = db.get(Job, application.job_id)
    student = db.get(User, application.student_id)

    return {
        "id": application.id,
        "job_id": application.job_id,

        "job_title": (
            job.title if job else "Job no longer available"
        ),

        "company": (
            job.company if job else ""
        ),

        "student_id": application.student_id,

        "student_name": (
            student.name if student else "Unknown student"
        ),

        "student_email": (
            student.email if student else ""
        ),

        "status": application.status,
        "created_at": application.created_at,

        "candidate_skills": (
            application.candidate_skills or []
        ),

        "matched_skills": (
            application.matched_skills or []
        ),

        "missing_skills": (
            application.missing_skills or []
        ),

        "match_percentage": (
            application.match_percentage or 0
        ),

        "resume_name": (
            application.resume_name or ""
        ),
    }


def match_result(
    job: Job,
    candidate_skills: list[str],
):
    return calculate_match(
        job.required_skills or [],
        job.mandatory_skills or [],
        candidate_skills,
        threshold=75,
    )


# --------------------------------------------------
# GENERAL
# --------------------------------------------------


@app.get("/")
def root():
    return {
        "message": "SkillBridge API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


# --------------------------------------------------
# AUTHENTICATION
# --------------------------------------------------

@app.post(
    "/auth/register",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
)
def register(
    payload: RegisterIn,
    db: Session = Depends(get_db),
):
    existing_user = db.scalar(
        select(User).where(
            User.email == payload.email
        )
    )

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists",
        )

    user = User(
        name=payload.name,
        email=str(payload.email).lower(),
        password_hash=hash_password(payload.password),
        role=payload.role,
        company=payload.company,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


@app.post("/auth/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    email = form_data.username.lower().strip()

    user = db.scalar(
        select(User).where(
            User.email == email
        )
    )

    if not user or not verify_password(
        form_data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    token = create_access_token(str(user.id))

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "company": user.company,
        },
    }


@app.get(
    "/auth/me",
    response_model=UserOut,
)
def get_me(
    user: User = Depends(current_user),
):
    return user


# --------------------------------------------------
# STUDENT PROFILE
# --------------------------------------------------

@app.get("/students/profile")
def student_profile(
    user: User = Depends(require_role("student")),
):
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "company": user.company,
    }


# --------------------------------------------------
# JOB MANAGEMENT
# --------------------------------------------------

@app.get("/jobs", response_model=list[JobOut])
def get_jobs(
    db: Session = Depends(get_db),
):
    return list(
        db.scalars(
            select(Job).order_by(
                Job.created_at.desc()
            )
        ).all()
    )


@app.get(
    "/jobs/{job_id}",
    response_model=JobOut,
)
def get_job(
    job_id: int,
    db: Session = Depends(get_db),
):
    job = db.get(Job, job_id)

    if not job:
        raise HTTPException(
            status_code=404,
            detail="Job not found",
        )

    return job


@app.post(
    "/jobs",
    response_model=JobOut,
    status_code=status.HTTP_201_CREATED,
)
def create_job(
    payload: JobCreate,
    user: User = Depends(require_role("recruiter")),
    db: Session = Depends(get_db),
):
    job = Job(
        owner_id=user.id,
        title=payload.title,
        company=payload.company,
        location=payload.location,
        job_type=payload.job_type,
        experience=payload.experience,
        description=payload.description,
        required_skills=payload.required_skills,
        mandatory_skills=payload.mandatory_skills,
    )

    db.add(job)
    db.commit()
    db.refresh(job)

    return job


@app.put(
    "/jobs/{job_id}",
    response_model=JobOut,
)
def update_job(
    job_id: int,
    payload: JobCreate,
    user: User = Depends(require_role("recruiter")),
    db: Session = Depends(get_db),
):
    job = get_owned_job(job_id, user, db)

    job.title = payload.title
    job.company = payload.company
    job.location = payload.location
    job.job_type = payload.job_type
    job.experience = payload.experience
    job.description = payload.description
    job.required_skills = payload.required_skills
    job.mandatory_skills = payload.mandatory_skills

    db.commit()
    db.refresh(job)

    return job


@app.delete("/jobs/{job_id}")
def delete_job(
    job_id: int,
    user: User = Depends(require_role("recruiter")),
    db: Session = Depends(get_db),
):
    job = get_owned_job(job_id, user, db)

    existing_application = db.scalar(
        select(Application).where(
            Application.job_id == job_id
        )
    )

    if existing_application:
        raise HTTPException(
            status_code=409,
            detail=(
                "This job has applications. You cannot delete it "
                "until its applications have been handled."
            ),
        )

    db.delete(job)
    db.commit()

    return {
        "message": "Job deleted successfully"
    }


@app.get(
    "/recruiter/jobs",
    response_model=list[JobOut],
)
def recruiter_jobs(
    db: Session = Depends(get_db),
    user: User = Depends(require_role("recruiter")),
):
    return db.scalars(
        select(Job)
        .where(Job.owner_id == user.id)
        .order_by(Job.created_at.desc())
    ).all()

# --------------------------------------------------
# RESUME UPLOAD AND SKILL EXTRACTION
# --------------------------------------------------

@app.post("/resume/analyze")
async def analyze_resume(
    file: UploadFile = File(...),
    user: User = Depends(require_role("student")),
    db: Session = Depends(get_db),
):
    original_name = Path(file.filename or "resume.txt").name
    extension = Path(original_name).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Upload a PDF, DOCX, or TXT resume",
        )

    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty",
        )

    if len(content) > MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail=f"Resume must be smaller than {MAX_UPLOAD_MB} MB",
        )

    try:
        text_content = extract_text(original_name, content)
        skills = extract_skills(text_content)
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Could not read this resume: {str(exc)}",
        )

    stored_name = (
        f"user_{user.id}_{uuid.uuid4().hex}{extension}"
    )

    stored_path = (UPLOAD_DIR / stored_name).resolve()

    if UPLOAD_DIR not in stored_path.parents:
        raise HTTPException(
            status_code=400,
            detail="Invalid file path",
        )

    stored_path.write_bytes(content)

    old_path = getattr(user, "resume_path", None)

    # These fields must exist in your User model.
    user.resume_path = str(stored_path)
    user.resume_filename = original_name

    db.commit()

    if old_path:
        try:
            previous_path = Path(old_path).resolve()

            if (
                UPLOAD_DIR in previous_path.parents
                and previous_path.exists()
            ):
                previous_path.unlink()

        except OSError:
            pass

    return {
        "filename": original_name,
        "skills": skills,
        "characters_read": len(text_content),
        "notice": (
            "Resume analyzed. Review the extracted skills before matching."
        ),
    }


# --------------------------------------------------
# STUDENT: MY RESUME INFORMATION
# --------------------------------------------------

@app.get("/resume/mine")
def get_my_resume(
    user: User = Depends(require_role("student")),
):
    return {
        "resume_name": getattr(user, "resume_filename", None),
        "resume_uploaded": bool(
            getattr(user, "resume_path", None)
        ),
    }


# --------------------------------------------------
# SKILL MATCHING
# --------------------------------------------------

@app.post("/skills/match")
def match_skills(
    payload: MatchIn,
    user: User = Depends(require_role("student")),
    db: Session = Depends(get_db),
):
    job = db.get(Job, payload.job_id)

    if not job:
        raise HTTPException(
            status_code=404,
            detail="Job not found",
        )

    return match_result(
        job,
        payload.candidate_skills,
    )


# --------------------------------------------------
# STUDENT: APPLY FOR A JOB
# --------------------------------------------------

@app.post(
    "/applications",
    status_code=status.HTTP_201_CREATED,
)
@app.post(
    "/applications/apply",
    status_code=status.HTTP_201_CREATED,
)
def apply_for_job(
    payload: ApplicationIn,
    user: User = Depends(require_role("student")),
    db: Session = Depends(get_db),
):
    job = db.get(Job, payload.job_id)

    if not job:
        raise HTTPException(
            status_code=404,
            detail="Job not found",
        )

    existing = db.scalar(
        select(Application).where(
            Application.student_id == user.id,
            Application.job_id == job.id,
        )
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="You have already applied for this job",
        )

    candidate_skills = list(dict.fromkeys(
        skill.strip()
        for skill in payload.candidate_skills
        if skill and skill.strip()
    ))

    if not candidate_skills:
        raise HTTPException(
            status_code=400,
            detail="Upload a resume or select your skills before applying",
        )

    result = match_result(job, candidate_skills)

    if not result.get("eligible", False):
        raise HTTPException(
            status_code=422,
            detail={
                "message": result.get(
                    "message",
                    "You do not meet the requirements for this job yet.",
                ),
                "match": result,
            },
        )

    application = Application(
        student_id=user.id,
        job_id=job.id,
        status="Submitted",
        candidate_skills=candidate_skills,
        matched_skills=result.get("matched_skills", []),
        missing_skills=result.get("missing_skills", []),
        match_percentage=result.get("match_percentage", 0),
        resume_name=(
            getattr(user, "resume_filename", None) or ""
        ),
    )

    db.add(application)
    db.commit()
    db.refresh(application)

    return {
        "id": application.id,
        "job_id": job.id,
        "status": application.status,
        "match_percentage": application.match_percentage,
        "message": "Application submitted successfully",
    }


# --------------------------------------------------
# STUDENT: MY APPLICATIONS
# --------------------------------------------------

@app.get("/applications/mine")
def my_applications(
    user: User = Depends(require_role("student")),
    db: Session = Depends(get_db),
):
    applications = db.scalars(
        select(Application)
        .where(Application.student_id == user.id)
        .order_by(Application.created_at.desc())
    ).all()

    return [
        application_dict(application, db)
        for application in applications
    ]


# --------------------------------------------------
# RECRUITER: APPLICATIONS RECEIVED
# --------------------------------------------------

@app.get("/applications/received")
@app.get("/recruiter/applications")
def received_applications(
    user: User = Depends(require_role("recruiter")),
    db: Session = Depends(get_db),
):
    jobs = db.scalars(
        select(Job).where(
            Job.owner_id == user.id
        )
    ).all()

    job_ids = [job.id for job in jobs]

    if not job_ids:
        return []

    applications = db.scalars(
        select(Application)
        .where(Application.job_id.in_(job_ids))
        .order_by(Application.created_at.desc())
    ).all()

    return [
        application_dict(application, db)
        for application in applications
    ]


# --------------------------------------------------
# RECRUITER: APPLICATIONS FOR ONE JOB
# --------------------------------------------------

@app.get("/jobs/{job_id}/applications")
def applications_for_job(
    job_id: int,
    user: User = Depends(require_role("recruiter")),
    db: Session = Depends(get_db),
):
    get_owned_job(job_id, user, db)

    applications = db.scalars(
        select(Application)
        .where(Application.job_id == job_id)
        .order_by(Application.created_at.desc())
    ).all()

    return [
        application_dict(application, db)
        for application in applications
    ]


# --------------------------------------------------
# RECRUITER: UPDATE APPLICATION STATUS
# --------------------------------------------------

def change_application_status(
    application_id: int,
    payload: StatusIn,
    user: User,
    db: Session,
):
    application = db.get(Application, application_id)

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application not found",
        )

    get_owned_job(
        application.job_id,
        user,
        db,
    )

    if payload.status not in APPLICATION_STATUSES:
        raise HTTPException(
            status_code=400,
            detail="Invalid application status",
        )

    application.status = payload.status

    db.commit()
    db.refresh(application)

    return {
        "id": application.id,
        "status": application.status,
        "message": "Application status updated successfully",
    }


@app.patch("/applications/{application_id}")
def update_application_status(
    application_id: int,
    payload: StatusIn,
    user: User = Depends(require_role("recruiter")),
    db: Session = Depends(get_db),
):
    return change_application_status(
        application_id,
        payload,
        user,
        db,
    )


@app.patch("/applications/{application_id}/status")
def update_application_status_compatible(
    application_id: int,
    payload: StatusIn,
    user: User = Depends(require_role("recruiter")),
    db: Session = Depends(get_db),
):
    return change_application_status(
        application_id,
        payload,
        user,
        db,
    )


# --------------------------------------------------
# RECRUITER: VIEW / DOWNLOAD APPLICANT RESUME
# --------------------------------------------------

@app.get("/applications/{application_id}/resume")
def get_applicant_resume(
    application_id: int,
    user: User = Depends(require_role("recruiter")),
    db: Session = Depends(get_db),
):
    application = db.get(Application, application_id)

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application not found",
        )

    # Only the recruiter who owns the job can access this resume.
    get_owned_job(
        application.job_id,
        user,
        db,
    )

    student = db.get(User, application.student_id)

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Applicant not found",
        )

    resume_path = getattr(student, "resume_path", None)

    if not resume_path:
        raise HTTPException(
            status_code=404,
            detail="Applicant has not uploaded a resume",
        )

    path = Path(resume_path).resolve()

    if not path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Resume file not found on server",
        )

    # Ensure the requested file is inside the upload directory.
    if UPLOAD_DIR not in path.parents:
        raise HTTPException(
            status_code=403,
            detail="Invalid resume file location",
        )

    filename = (
        getattr(student, "resume_filename", None)
        or application.resume_name
        or path.name
    )

    extension = path.suffix.lower()

    if extension == ".pdf":
        media_type = "application/pdf"
        disposition = "inline"
    elif extension == ".docx":
        media_type = (
            "application/vnd.openxmlformats-officedocument."
            "wordprocessingml.document"
        )
        disposition = "attachment"
    elif extension == ".txt":
        media_type = "text/plain"
        disposition = "inline"
    else:
        media_type = "application/octet-stream"
        disposition = "attachment"

    return FileResponse(
        path=str(path),
        filename=filename,
        media_type=media_type,
        content_disposition_type=disposition,
    )

# --------------------------------------------------
# INTERVIEW QUESTIONS
# --------------------------------------------------

@app.post("/interview/questions")
@app.post("/interview/prepare")
def interview_questions(
    payload: QuestionsIn,
    user: User = Depends(require_role("student")),
):
    skills = payload.skills or []

    if not skills:
        raise HTTPException(
            status_code=400,
            detail="Provide at least one skill",
        )

    try:
        questions = generate_questions(
            skills,
            count=payload.count,
        )

        return {
            "questions": questions,
            "skills": skills,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to generate questions: {str(exc)}",
        )


# --------------------------------------------------
# INTERVIEW PREPARATION PDF
# --------------------------------------------------

@app.post("/preparation/pdf")
@app.post("/preparation/generate-pdf")
def generate_preparation_pdf(
    payload: PdfIn,
    user: User = Depends(require_role("student")),
):
    try:
        pdf_bytes = build_study_pdf(
            payload.job_title,
            payload.missing_skills,
            payload.questions,
        )

        if hasattr(pdf_bytes, "getvalue"):
            pdf_bytes = pdf_bytes.getvalue()

        if not isinstance(pdf_bytes, bytes):
            raise ValueError("PDF generator did not return PDF bytes")

        return StreamingResponse(
            BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": (
                    'attachment; filename="SkillBridge_Interview_Prep.pdf"'
                )
            },
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to generate preparation PDF: {str(exc)}",
        )



# --------------------------------------------------
# AI MENTOR
# --------------------------------------------------

@app.post("/api/mentor/prepare")
async def mentor_prepare(
    payload: dict,
    user: User = Depends(require_role("student")),
):
    try:
        result = await prepare_study_guide(payload)
        return result

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to prepare study guide: {str(exc)}",
        )


@app.post("/api/mentor/chat")
async def mentor_chat(
    payload: dict,
    user: User = Depends(require_role("student")),
):
    message = str(payload.get("message", "")).strip()

    if not message:
        raise HTTPException(
            status_code=400,
            detail="Enter a message",
        )

    try:
        result = await chat_with_mentor(payload)
        return result

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"AI Mentor request failed: {str(exc)}",
        )


# --------------------------------------------------
# STUDENT DASHBOARD
# --------------------------------------------------

@app.get("/dashboard/student")
def student_dashboard(
    user: User = Depends(require_role("student")),
    db: Session = Depends(get_db),
):
    applications = db.scalars(
        select(Application).where(
            Application.student_id == user.id
        )
    ).all()

    jobs_count = db.query(Job).count()

    return {
        "student": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
        },
        "available_jobs": jobs_count,
        "total_applications": len(applications),
        "submitted": sum(
            1 for item in applications
            if item.status == "Submitted"
        ),
        "under_review": sum(
            1 for item in applications
            if item.status == "Under Review"
        ),
        "shortlisted": sum(
            1 for item in applications
            if item.status == "Shortlisted"
        ),
        "interviews": sum(
            1 for item in applications
            if item.status == "Interview"
        ),
    }


# --------------------------------------------------
# RECRUITER DASHBOARD
# --------------------------------------------------

@app.get("/dashboard/recruiter")
def recruiter_dashboard(
    user: User = Depends(require_role("recruiter")),
    db: Session = Depends(get_db),
):
    jobs = db.scalars(
        select(Job).where(
            Job.owner_id == user.id
        )
    ).all()

    job_ids = [job.id for job in jobs]

    applications = []

    if job_ids:
        applications = db.scalars(
            select(Application).where(
                Application.job_id.in_(job_ids)
            )
        ).all()

    return {
        "recruiter": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "company": user.company,
        },
        "total_jobs": len(jobs),
        "total_applications": len(applications),
        "submitted": sum(
            1 for item in applications
            if item.status == "Submitted"
        ),
        "under_review": sum(
            1 for item in applications
            if item.status == "Under Review"
        ),
        "shortlisted": sum(
            1 for item in applications
            if item.status == "Shortlisted"
        ),
        "interviews": sum(
            1 for item in applications
            if item.status == "Interview"
        ),
        "rejected": sum(
            1 for item in applications
            if item.status == "Rejected"
        ),
    }


# --------------------------------------------------
# RECRUITER: APPLICANT DETAILS
# --------------------------------------------------

@app.get("/applications/{application_id}/details")
def applicant_details(
    application_id: int,
    user: User = Depends(require_role("recruiter")),
    db: Session = Depends(get_db),
):
    application = db.get(Application, application_id)

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application not found",
        )

    get_owned_job(
        application.job_id,
        user,
        db,
    )

    student = db.get(User, application.student_id)

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Applicant not found",
        )

    return {
        **application_dict(application, db),
        "resume_uploaded": bool(
            getattr(student, "resume_path", None)
        ),
        "resume_name": (
            getattr(student, "resume_filename", None)
            or application.resume_name
            or ""
        ),
    }


# --------------------------------------------------
# RECRUITER: RESUME DOWNLOAD
# --------------------------------------------------

@app.get("/applications/{application_id}/resume/download")
def download_applicant_resume(
    application_id: int,
    user: User = Depends(require_role("recruiter")),
    db: Session = Depends(get_db),
):
    application = db.get(Application, application_id)

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application not found",
        )

    get_owned_job(
        application.job_id,
        user,
        db,
    )

    student = db.get(User, application.student_id)

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Applicant not found",
        )

    resume_path = getattr(student, "resume_path", None)

    if not resume_path:
        raise HTTPException(
            status_code=404,
            detail="No resume uploaded by this applicant",
        )

    path = Path(resume_path).resolve()

    if not path.is_file() or UPLOAD_DIR not in path.parents:
        raise HTTPException(
            status_code=404,
            detail="Resume file not found",
        )

    filename = (
        getattr(student, "resume_filename", None)
        or application.resume_name
        or path.name
    )

    return FileResponse(
        path=str(path),
        filename=filename,
        media_type="application/octet-stream",
        content_disposition_type="attachment",
    )
