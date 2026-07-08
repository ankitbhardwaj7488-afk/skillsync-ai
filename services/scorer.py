def calculate_score(skills):
    score = len(skills) * 10

    if score > 100:
        score = 100

    return score