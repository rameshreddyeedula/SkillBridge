from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, ListFlowable, ListItem
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch
def build_study_pdf(job_title: str, missing_skills: list[str], questions: list[dict]) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=0.7*inch, leftMargin=0.7*inch, topMargin=0.7*inch, bottomMargin=0.7*inch)
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="SBTitle", parent=styles["Title"], textColor=colors.HexColor("#5140d0"), spaceAfter=12))
    styles.add(ParagraphStyle(name="SBHead", parent=styles["Heading2"], textColor=colors.HexColor("#5140d0"), spaceBefore=12, spaceAfter=6))
    story = [Paragraph("SkillBridge Interview Preparation Guide", styles["SBTitle"]), Paragraph(job_title, styles["Heading2"]), Spacer(1, 8)]
    story.append(Paragraph("Skills to strengthen", styles["SBHead"]))
    if missing_skills:
        story.append(ListFlowable([ListItem(Paragraph(s, styles["BodyText"])) for s in missing_skills], bulletType="bullet"))
    else:
        story.append(Paragraph("Review the role's required skills and practise explaining your projects.", styles["BodyText"]))
    story.append(Paragraph("Suggested 7-day plan", styles["SBHead"]))
    plan = ["Day 1–2: Study the fundamentals of your top missing skill.", "Day 3: Follow a tutorial and reproduce the example yourself.", "Day 4: Answer interview questions without looking at notes.", "Day 5: Build or improve a small project demonstrating the skill.", "Day 6: Review mistakes and explain your solution aloud.", "Day 7: Retake the practice quiz and update your profile."]
    story.append(ListFlowable([ListItem(Paragraph(p, styles["BodyText"])) for p in plan], bulletType="1"))
    story.append(Paragraph("Interview practice questions", styles["SBHead"]))
    for i, q in enumerate(questions, 1):
        question = q.get("question", "Practice question")
        options = q.get("options", [])
        correct = q.get("correct_index", 0)
        explanation = q.get("explanation", "")
        story.append(Paragraph(f"<b>{i}. {question}</b>", styles["BodyText"]))
        for j, opt in enumerate(options):
            story.append(Paragraph(("✓ " if j == correct else "• ") + str(opt), styles["BodyText"]))
        if explanation: story.append(Paragraph("<i>Explanation: " + str(explanation) + "</i>", styles["BodyText"]))
        story.append(Spacer(1, 7))
    story.append(Paragraph("Learning links", styles["SBHead"]))
    for skill in (missing_skills or ["interview preparation"]):
        url = "https://www.youtube.com/results?search_query=" + skill.replace(" ", "+") + "+interview+tutorial"
        story.append(Paragraph(f'{skill}: <link href="{url}" color="#5140d0">{url}</link>', styles["BodyText"]))
    doc.build(story)
    return buffer.getvalue()
