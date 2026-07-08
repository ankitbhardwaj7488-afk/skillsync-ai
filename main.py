from fastapi import FastAPI, UploadFile, File, Body
import pdfplumber

from services.text_processor import clean_text
from services.skill_extractor import extract_skills
from services.scorer import calculate_score
from services.matcher import calculate_match

app = FastAPI()


@app.get("/")
def home():
    return {
        "message": "SkillSync AI Running 🚀"
    }


@app.post("/upload-resume")
async def upload_resume(file: UploadFile = File(...)):

    if not file.filename.endswith(".pdf"):
        return {
            "error": "Only PDF files are allowed"
        }

    with pdfplumber.open(file.file) as pdf:
        text = ""

        for page in pdf.pages:
            text += page.extract_text() or ""

    cleaned_text = clean_text(text)

    skills = extract_skills(cleaned_text)

    score = calculate_score(skills)

    return {
        "filename": file.filename,
        "skills_found": skills,
        "score": score,
        "content_preview": cleaned_text[:500]
    }


@app.post("/match-resume")
async def match_resume(
    file: UploadFile = File(...),
    job_description: str = Body(...)
):

    if not file.filename.endswith(".pdf"):
        return {
            "error": "Only PDF files are allowed"
        }

    with pdfplumber.open(file.file) as pdf:
        text = ""

        for page in pdf.pages:
            text += page.extract_text() or ""

    cleaned_text = clean_text(text)

    candidate_skills = extract_skills(cleaned_text)

    required_skills = extract_skills(job_description)

    match_percentage = calculate_match(
        candidate_skills,
        required_skills
    )

    return {
        "candidate_skills": candidate_skills,
        "required_skills": required_skills,
        "match_percentage": match_percentage
    }


@app.post("/upload-multiple-resumes")
async def upload_multiple_resumes(
    files: list[UploadFile] = File(...)
):

    results = []

    for file in files:

        if not file.filename.endswith(".pdf"):
            continue

        with pdfplumber.open(file.file) as pdf:
            text = ""

            for page in pdf.pages:
                text += page.extract_text() or ""

        cleaned_text = clean_text(text)

        skills = extract_skills(cleaned_text)

        score = calculate_score(skills)

        results.append({
            "filename": file.filename,
            "skills_found": skills,
            "score": score
        })

    return {
        "total_resumes": len(results),
        "candidates": results
    }