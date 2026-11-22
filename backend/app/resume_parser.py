from pathlib import Path
from pypdf import PdfReader
from docx import Document
import io, re
SKILL_ALIASES = {
 "javascript": ["javascript", "js", "ecmascript"],
 "typescript": ["typescript", "ts"],
 "react": ["react", "react.js", "reactjs"],
 "html": ["html", "html5"],
 "css": ["css", "css3"],
 "responsive design": ["responsive design", "responsive web design"],
 "rest apis": ["rest api", "rest apis", "restful api", "api integration"],
 "testing": ["testing", "unit testing", "jest", "pytest", "test cases"],
 "git": ["git", "github", "gitlab"],
 "python": ["python"],
 "fastapi": ["fastapi"],
 "sql": ["sql", "postgresql", "mysql", "sqlite"],
 "postgresql": ["postgresql", "postgres"],
 "django": ["django"],
 "flask": ["flask"],
 "node.js": ["node.js", "nodejs"],
 "express": ["express.js", "express"],
 "java": ["java"],
 "c": [" c programming ", " c language "],
 "c++": ["c++"],
 "power bi": ["power bi", "powerbi"],
 "excel": ["excel", "microsoft excel"],
 "communication": ["communication skills", "communication"],
 "problem solving": ["problem solving", "problem-solving"],
 "aws": ["aws", "amazon web services"],
}
def extract_text(filename: str, content: bytes) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix == ".pdf":
        reader = PdfReader(io.BytesIO(content))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    if suffix == ".docx":
        doc = Document(io.BytesIO(content))
        return "\n".join(p.text for p in doc.paragraphs)
    if suffix == ".txt":
        return content.decode("utf-8", errors="ignore")
    raise ValueError("Unsupported file type. Upload PDF, DOCX, or TXT.")
def extract_skills(text: str) -> list[str]:
    normalized = " " + re.sub(r"[^a-z0-9+#.]+", " ", text.lower()) + " "
    found = []
    for canonical, aliases in SKILL_ALIASES.items():
        for alias in aliases:
            pattern = " " + alias.lower().strip() + " "
            if pattern in normalized:
                found.append(canonical)
                break
    return sorted(set(found))
