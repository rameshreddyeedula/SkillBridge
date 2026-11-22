
import re


DEFAULT_THRESHOLD = 75


def normalize(value: str) -> str:
    """Normalize a skill for case-insensitive comparison."""
    if not isinstance(value, str):
        return ""

    value = value.strip().lower()
    value = re.sub(r"[^\w+#.]", " ", value)
    value = re.sub(r"\s+", " ", value)

    return value.strip()


def clean_skills(skills: list[str] | None) -> list[str]:
    """Remove empty and duplicate skills while preserving order."""
    result = []
    seen = set()

    for skill in skills or []:
        if not isinstance(skill, str):
            continue

        skill = skill.strip()
        normalized = normalize(skill)

        if normalized and normalized not in seen:
            seen.add(normalized)
            result.append(skill)

    return result


def calculate_match(
    required_skills: list[str],
    mandatory_skills: list[str],
    candidate_skills: list[str],
    threshold: int = DEFAULT_THRESHOLD,
):
    """Calculate student eligibility for a job."""

    if not 0 <= threshold <= 100:
        raise ValueError("Threshold must be between 0 and 100")

    required = clean_skills(required_skills)
    mandatory = clean_skills(mandatory_skills)
    candidates = clean_skills(candidate_skills)

    candidate_lookup = {
        normalize(skill) for skill in candidates
    }

    matched = []
    missing = []

    for skill in required:
        if normalize(skill) in candidate_lookup:
            matched.append(skill)
        else:
            missing.append(skill)

    mandatory_missing = [
        skill
        for skill in mandatory
        if normalize(skill) not in candidate_lookup
    ]

    total = len(required)

    percentage = (
        round((len(matched) / total) * 100)
        if total
        else 0
    )

    eligible = (
        total > 0
        and percentage >= threshold
        and not mandatory_missing
    )

    if mandatory_missing:
        message = (
            "You are missing mandatory skills: "
            + ", ".join(mandatory_missing)
        )

    elif eligible and missing:
        message = (
            f"You meet the initial {threshold}% match threshold. "
            "Prepare for interview questions on: "
            + ", ".join(missing)
        )

    elif eligible:
        message = (
            "Your skills match the listed job requirements. "
            "Prepare for the interview."
        )

    else:
        message = (
            f"Your current match is below the {threshold}% "
            "initial threshold. Build the missing skills: "
            + ", ".join(missing)
        )

    return {
        "match_percentage": percentage,
        "matched_count": len(matched),
        "total_required": total,
        "matched_skills": matched,
        "missing_skills": missing,
        "mandatory_missing": mandatory_missing,
        "eligible": eligible,
        "threshold": threshold,
        "message": message,
    }
