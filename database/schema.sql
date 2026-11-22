-- Reference schema: the backend creates these tables automatically on first run.
-- For production, use migrations (Alembic) rather than create_all.
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'recruiter')),
  company VARCHAR(180),
  created_at TIMESTAMP NOT NULL
);
-- Jobs, applications, and their relationships are defined in backend/app/models.py.
