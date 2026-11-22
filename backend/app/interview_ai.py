QUESTION_BANK = [
 {"skill":"REST APIs","question":"What is a REST API?","options":["A way for applications to communicate through resource-based HTTP endpoints","A CSS framework","A database engine","A programming language"],"correct_index":0,"explanation":"A REST API exposes resources through endpoints and commonly uses HTTP methods such as GET, POST, PUT, and DELETE."},
 {"skill":"REST APIs","question":"Which HTTP method is commonly used to retrieve data?","options":["POST","GET","DELETE","PATCH"],"correct_index":1,"explanation":"GET is commonly used to retrieve a resource without requesting a state change."},
 {"skill":"React","question":"Which React hook is commonly used for side effects such as fetching data?","options":["useEffect","useMemo","useRef only","createElement"],"correct_index":0,"explanation":"useEffect synchronizes a component with external systems, including data-fetching requests."},
 {"skill":"Testing","question":"What is a unit test designed to test?","options":["A small unit of code or behavior","The entire internet connection","Only the visual theme","Physical hardware"],"correct_index":0,"explanation":"A unit test checks a small piece of behavior, often a function or component, in isolation."},
 {"skill":"Testing","question":"What does an assertion do in a test?","options":["Checks whether an expected condition is true","Installs a dependency","Creates a user account","Publishes a website"],"correct_index":0,"explanation":"An assertion compares an actual result with an expected result."},
 {"skill":"JavaScript","question":"What does Array.map() return?","options":["A new array containing transformed items","Always a number","The original array only","A database row"],"correct_index":0,"explanation":"map returns a new array with the callback result for each item."},
 {"skill":"Git","question":"What does git commit do?","options":["Records staged changes in the local repository","Uploads a video","Deletes every branch","Starts a React server"],"correct_index":0,"explanation":"A commit records staged changes as a snapshot in the local Git repository."},
 {"skill":"CSS","question":"Which CSS layout system is useful for one-dimensional row or column layouts?","options":["Flexbox","SQL","JWT","FastAPI"],"correct_index":0,"explanation":"Flexbox arranges items along a row or column."},
 {"skill":"Python","question":"Which Python structure stores key-value pairs?","options":["Dictionary","Tuple only","String","Integer"],"correct_index":0,"explanation":"A dictionary maps keys to values."},
 {"skill":"SQL","question":"Which SQL clause filters rows before grouping?","options":["WHERE","HAVING","ORDER BY","SELECT"],"correct_index":0,"explanation":"WHERE filters rows before GROUP BY; HAVING filters groups after aggregation."},
 {"skill":"HTML","question":"What is semantic HTML?","options":["Using elements that describe the meaning of content","Writing all styles inline","Using only div tags","A database query"],"correct_index":0,"explanation":"Semantic elements such as main, nav, article, and footer communicate structure and meaning."},
 {"skill":"Responsive Design","question":"What is the purpose of a CSS media query?","options":["Apply styles based on viewport/device conditions","Connect to PostgreSQL","Create a REST endpoint","Hash passwords"],"correct_index":0,"explanation":"Media queries adapt styles for different viewport sizes and device capabilities."},
]
def generate_questions(skills: list[str], count: int = 8):
    skills = [s.strip() for s in skills if s.strip()] or ["JavaScript", "REST APIs"]
    matched = []
    for skill in skills:
        matched.extend([dict(q, skill=skill) for q in QUESTION_BANK if q["skill"].lower() == skill.lower()])
    if not matched:
        matched = [dict(q) for q in QUESTION_BANK]
    # Fill up to requested count using other general questions if there are few questions for a skill.
    for q in QUESTION_BANK:
        if len(matched) >= count: break
        if q not in matched: matched.append(q)
    return matched[:count]
