import json


with open("data/skills.json", "r") as file:
    skills_data = json.load(file)

skills_list = skills_data["skills"]


def extract_skills(text):

    found_skills = []

    text = text.lower()

    for skill in skills_list:

        if skill.lower() in text:
            found_skills.append(skill)

    return found_skills