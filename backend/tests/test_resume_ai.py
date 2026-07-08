from app.services.resume_ai import analyze, extract_skills, interview_questions, match


SAMPLE = """Ava Patel
ava@example.com
Software Engineer
Built a FastAPI and PostgreSQL platform with React and Docker. Improved latency by 35%.
Bachelor of Technology, Example University
"""


def test_extracts_known_skills():
    assert set(extract_skills(SAMPLE)) >= {"FastAPI", "PostgreSQL", "React", "Docker"}


def test_analysis_has_bounded_score():
    result = analyze(SAMPLE)
    assert 0 <= result["ats_score"] <= 100
    assert result["parsed_data"]["email"] == "ava@example.com"


def test_match_explains_overlap():
    result = match(SAMPLE, "Need a Python FastAPI engineer with AWS and PostgreSQL")
    assert result["match_percentage"] > 0
    assert "FastAPI" in result["matched_skills"]
    assert "AWS" in result["missing_skills"]


def test_interview_generation():
    assert interview_questions(SAMPLE, "FastAPI engineer")["technical"]

