def calculate_match(candidate_skills, required_skills):

    if len(required_skills) == 0:
        return 0

    matched = 0

    for skill in required_skills:
        if skill in candidate_skills:
            matched += 1

    match_percentage = (matched / len(required_skills)) * 100

    return round(match_percentage, 2)