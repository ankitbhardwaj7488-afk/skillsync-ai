import io
import re
from collections import Counter
import pdfplumber

SKILLS = ["Python", "Java", "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "FastAPI", "Django", "Flask", "SQL", "PostgreSQL", "MongoDB", "Redis", "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Git", "CI/CD", "REST", "GraphQL", "Machine Learning", "TensorFlow", "PyTorch", "NLP", "LangChain", "FAISS", "Data Structures", "System Design", "Linux", "Figma", "Agile"]


def extract_pdf(content: bytes) -> str:
    try:
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            text = "\n".join(page.extract_text() or "" for page in pdf.pages)
    except Exception as exc:
        raise ValueError("The PDF could not be read") from exc
    if len(text.strip()) < 30:
        raise ValueError("This PDF has no extractable text")
    return re.sub(r"[ \t]+", " ", text).strip()


def extract_skills(text: str) -> list[str]:
    low = text.lower()
    return [skill for skill in SKILLS if re.search(r"(?<!\w)" + re.escape(skill.lower()) + r"(?!\w)", low)]


def extract_sections(text: str) -> dict:
    email = re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", text)
    phone = re.search(r"(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3}\)?[\s-]?)?\d{3}[\s-]?\d{4}", text)
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    def section(pattern: str) -> list[str]:
        hits = [x for x in lines if re.search(pattern, x, re.I)]
        return hits[:5]
    return {
        "name": lines[0][:100] if lines else "Unknown",
        "email": email.group(0) if email else None,
        "phone": phone.group(0) if phone else None,
        "skills": extract_skills(text),
        "education": section(r"bachelor|master|b\.tech|m\.tech|university|college"),
        "experience": section(r"engineer|developer|intern|manager|experience"),
        "projects": section(r"project|built|developed|implemented"),
        "certifications": section(r"certif|credential|licensed"),
    }


def analyze(text: str) -> dict:
    parsed = extract_sections(text)
    skills, words = parsed["skills"], len(text.split())
    components = {
        "skills": min(30, len(skills) * 4),
        "experience": min(25, len(parsed["experience"]) * 6),
        "projects": min(20, len(parsed["projects"]) * 5),
        "education": min(15, len(parsed["education"]) * 5),
        "certifications": min(10, len(parsed["certifications"]) * 5),
    }
    score = min(100, sum(components.values()) + (5 if 300 <= words <= 900 else 0))
    strengths = []
    if len(skills) >= 6: strengths.append("Strong, clearly identifiable technical skill set")
    if parsed["projects"]: strengths.append("Projects demonstrate practical delivery experience")
    if parsed["experience"]: strengths.append("Relevant experience is visible to ATS parsers")
    weaknesses = []
    if words < 250: weaknesses.append("Resume is too brief to show enough evidence")
    if not parsed["certifications"]: weaknesses.append("No certifications or credentials identified")
    if not re.search(r"\b\d+(?:%|\+|k|m)\b", text, re.I): weaknesses.append("Achievements lack quantified impact")
    suggestions = ["Add measurable outcomes to each recent role", "Mirror relevant keywords from each job description", "Use concise action-led bullets and standard section headings"]
    return {"parsed_data": parsed, "ats_score": float(score), "score_breakdown": components, "strengths": strengths or ["Readable structure and contact information"], "weaknesses": weaknesses or ["Add more role-specific evidence"], "suggestions": suggestions, "learning_roadmap": [{"week": 1, "focus": "Core skill gaps", "action": "Complete one focused course"}, {"week": 2, "focus": "Applied project", "action": "Build and document a portfolio feature"}, {"week": 3, "focus": "Interview readiness", "action": "Practice technical and behavioral questions"}]}


def match(text: str, description: str) -> dict:
    candidate, required = set(extract_skills(text)), set(extract_skills(description))
    matched, missing = sorted(candidate & required), sorted(required - candidate)
    skill_score = 100.0 if not required else len(matched) / len(required) * 100
    desc_words = set(re.findall(r"[a-z]{4,}", description.lower()))
    resume_words = set(re.findall(r"[a-z]{4,}", text.lower()))
    lexical = len(desc_words & resume_words) / max(1, len(desc_words)) * 100
    score = round(skill_score * .75 + lexical * .25, 1)
    return {"match_percentage": score, "matched_skills": matched, "missing_skills": missing, "explanation": f"Matched {len(matched)} of {len(required)} required skills. " + (f"Strongest overlap: {', '.join(matched[:5])}." if matched else "Add evidence for the role's core skills.")}


def interview_questions(resume: str, job: str) -> dict:
    skills = extract_skills(job)[:4] or extract_skills(resume)[:4]
    technical = [f"Describe a production challenge you solved using {s}." for s in skills]
    return {"technical": technical or ["Walk through a technically difficult project and your decisions."], "behavioral": ["Tell me about a time you changed direction after receiving difficult feedback.", "Describe a conflict with a teammate and how you resolved it."], "hr": ["Why does this role fit your next career step?", "What environment helps you do your best work?"]}


def semantic_score(query: str, text: str) -> float:
    q = Counter(re.findall(r"[a-z0-9+#.]{2,}", query.lower()))
    d = Counter(re.findall(r"[a-z0-9+#.]{2,}", text.lower()))
    overlap = sum(min(q[k], d[k]) for k in q)
    return round(overlap / max(1, sum(q.values())) * 100, 1)

