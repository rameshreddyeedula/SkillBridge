import ast
import asyncio
import builtins
import json
import os
import re
import shutil
import subprocess
import tempfile

import httpx
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(
    Path(__file__).resolve().parents[1] / ".env"
)


# ==================================================
# CONFIGURATION
# ==================================================

OLLAMA_URL = os.getenv(
    "OLLAMA_URL",
    "http://127.0.0.1:11434",
).rstrip("/")

OLLAMA_MODEL = os.getenv(
    "OLLAMA_MODEL",
    "qwen2.5-coder:1.5b",
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-2.5-flash",
)
ALLOW_OLLAMA_FALLBACK = (
    os.getenv("ALLOW_OLLAMA_FALLBACK", "true").lower()
    == "true"
)
print("Loaded Gemini model:", GEMINI_MODEL)
print("Gemini API key loaded:", bool(GEMINI_API_KEY))

# ==================================================
# LOCAL OLLAMA CONNECTION
# ==================================================

async def _ask_ollama_local(
    prompt: str,
    *,
    json_mode: bool = False,
    num_predict: int = 1200,
    system_prompt=None,
) -> str:

    """Call local Ollama."""

    options = {
        "temperature": 0.1,
        "top_p": 0.85,
        "num_ctx": 4096,
        "num_predict": num_predict,
        "repeat_penalty": 1.15,
    }

    if system_prompt:
        request_data = {
            "model": OLLAMA_MODEL,
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            "stream": False,
            "options": options,
        }

        endpoint = "/api/chat"

    else:
        request_data = {
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "options": options,
        }

        endpoint = "/api/generate"

    if json_mode:
        request_data["format"] = "json"

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{OLLAMA_URL}{endpoint}",
                json=request_data,
            )

            response.raise_for_status()
            data = response.json()

        if system_prompt:
            answer = (
                data.get("message") or {}
            ).get("content", "").strip()

        else:
            answer = data.get("response", "").strip()

        if not answer:
            raise RuntimeError(
                "Ollama returned an empty response."
            )

        return answer

    except httpx.ConnectError as exc:
        raise RuntimeError(
            "Cannot connect to Ollama. Please start Ollama."
        ) from exc

    except httpx.TimeoutException as exc:
        raise RuntimeError(
            "AI response timed out. Please try again."
        ) from exc

    except httpx.HTTPStatusError as exc:
        raise RuntimeError(
            f"Ollama HTTP error: {exc.response.status_code}. "
            "Check your configured model."
        ) from exc


# ==================================================
# GEMINI CONNECTION
# ==================================================

async def ask_gemini(
    prompt: str,
    *,
    json_mode: bool = False,
    num_predict: int = 1200,
    system_prompt=None,
) -> str:

    """Call Gemini using its REST generateContent endpoint."""

    if not GEMINI_API_KEY:
        raise RuntimeError(
            "GEMINI_API_KEY is not configured."
        )

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{GEMINI_MODEL}:generateContent"
    )

    request_data = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": prompt}
                ],
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": max(
                256,
                min(int(num_predict), 8192),
            ),
        },
    }

    if system_prompt:
        request_data["systemInstruction"] = {
            "parts": [
                {"text": str(system_prompt)}
            ]
        }

    if json_mode:
        request_data["generationConfig"][
            "responseMimeType"
        ] = "application/json"

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                url,
                headers={
                    "x-goog-api-key": GEMINI_API_KEY
                },
                json=request_data,
            )

            response.raise_for_status()
            data = response.json()

        candidates = data.get("candidates") or []

        if not candidates:
            raise RuntimeError(
                "Gemini returned no response candidate: "
                + str(
                    data.get("promptFeedback") or data
                )[:500]
            )

        parts = (
            candidates[0].get("content") or {}
        ).get("parts") or []

        answer = "\n".join(
            part.get("text", "")
            for part in parts
            if isinstance(part, dict)
            and part.get("text")
        ).strip()

        if not answer:
            raise RuntimeError(
                "Gemini returned an empty answer."
            )

        return answer

    except httpx.HTTPStatusError as exc:
        raise RuntimeError(
            f"Gemini API error {exc.response.status_code}: "
            f"{exc.response.text[:1000]}"
        ) from exc

    except httpx.TimeoutException as exc:
        raise RuntimeError(
            "Gemini request timed out. Please try again."
        ) from exc

    except httpx.RequestError as exc:
        raise RuntimeError(
            f"Could not connect to Gemini: {exc}"
        ) from exc



# ==================================================
# AI PROVIDER - GEMINI PRIMARY, OLLAMA FALLBACK
# ==================================================


async def ask_ollama(
    prompt: str,
    *,
    json_mode: bool = False,
    num_predict: int = 1200,
    system_prompt=None,
) -> str:

    """Use Gemini first and Ollama as an optional fallback."""

    if GEMINI_API_KEY:
        print("Trying Gemini...")

        try:
            answer = await ask_gemini(
                prompt,
                json_mode=json_mode,
                num_predict=num_predict,
                system_prompt=system_prompt,
            )

            print("Gemini succeeded!")
            return answer

        except Exception as gemini_error:
            print("Gemini failed:", gemini_error)

            if not ALLOW_OLLAMA_FALLBACK:
                raise RuntimeError(
                    f"Gemini failed: {gemini_error}"
                ) from gemini_error

            print("Switching to Ollama...")

    elif not ALLOW_OLLAMA_FALLBACK:
        raise RuntimeError(
            "GEMINI_API_KEY is not configured and Ollama fallback is disabled."
        )

    else:
        print("Gemini API key missing. Using Ollama...")

    answer = await _ask_ollama_local(
        prompt,
        json_mode=json_mode,
        num_predict=num_predict,
        system_prompt=system_prompt,
    )

    print("Ollama fallback succeeded!")
    return answer

    # ==================================================
# JSON PARSER
# ==================================================

def parse_json_response(answer: str) -> dict:

    if not answer:
        return {}

    answer = answer.strip()

    answer = re.sub(
        r"^```(?:json)?\s*",
        "",
        answer,
        flags=re.IGNORECASE,
    )

    answer = re.sub(
        r"\s*```$",
        "",
        answer,
    )

    try:
        data = json.loads(answer)

        if isinstance(data, dict):
            return data

        return {}

    except json.JSONDecodeError:
        pass

    start = answer.find("{")
    end = answer.rfind("}")

    if start != -1 and end > start:
        try:
            data = json.loads(answer[start:end + 1])

            if isinstance(data, dict):
                return data

        except json.JSONDecodeError:
            pass

    return {}


# ==================================================
# CLEAN AI RESPONSE
# ==================================================

def clean_chat_answer(answer: str) -> str:

    if not answer:
        return "I couldn't generate an answer. Please try again."

    answer = str(answer).strip()

    answer = re.sub(
        r"<think>.*?</think>",
        "",
        answer,
        flags=re.DOTALL | re.IGNORECASE,
    )

    answer = re.sub(
        r"<\|.*?\|>",
        "",
        answer,
    )

    answer = re.sub(
        r"^\s*(assistant|model)\s*:\s*",
        "",
        answer,
        flags=re.IGNORECASE,
    )

    answer = answer.strip()

    if not answer:
        return "I couldn't generate an answer. Please try again."

    return answer


# ==================================================
# CODE BLOCK EXTRACTION
# ==================================================

def extract_code_blocks(
    answer: str,
    language: str = None,
) -> list[str]:

    if not answer:
        return []

    pattern = r"```(\w*)\s*(.*?)```"

    matches = re.findall(
        pattern,
        answer,
        flags=re.DOTALL,
    )

    code_blocks = []

    for detected_language, code in matches:

        detected_language = (
            detected_language or ""
        ).strip().lower()

        if language:
            if detected_language != language.lower():
                continue

        code = code.strip()

        if code:
            code_blocks.append(code)

    return code_blocks


# ==================================================
# PYTHON SYNTAX VERIFICATION
# ==================================================

def verify_python_syntax(
    code: str,
) -> tuple[bool, str]:

    try:
        ast.parse(code)

        return True, "Python syntax is valid."

    except SyntaxError as exc:

        message = (
            f"Line {exc.lineno}: {exc.msg}"
        )

        return False, message


# ==================================================
# FIND POSSIBLE UNDEFINED FUNCTIONS
# ==================================================

def find_undefined_function_calls(
    code: str,
) -> list[str]:

    try:
        tree = ast.parse(code)

    except SyntaxError:
        return []

    defined_functions = set()
    called_functions = set()
    imported_functions = set()

    for node in ast.walk(tree):

        if isinstance(
            node,
            (ast.FunctionDef, ast.AsyncFunctionDef),
        ):
            defined_functions.add(node.name)

        elif isinstance(node, ast.Import):

            for alias in node.names:
                imported_functions.add(
                    alias.asname or alias.name.split(".")[0]
                )

        elif isinstance(node, ast.ImportFrom):

            for alias in node.names:
                imported_functions.add(
                    alias.asname or alias.name
                )

        elif isinstance(node, ast.Call):

            if isinstance(node.func, ast.Name):
                called_functions.add(node.func.id)

    builtin_functions = set(dir(builtins))

    allowed_functions = (
        defined_functions
        | imported_functions
        | builtin_functions
    )

    undefined_functions = sorted(
        called_functions - allowed_functions
    )

    ignored_functions = {
        "self",
        "cls",
        "super",
    }

    return [
        function
        for function in undefined_functions
        if function not in ignored_functions
    ]
    # ==================================================
# OPTIONAL PYTHON EXECUTION VERIFICATION
# ==================================================

def run_python_in_docker(
    code: str,
) -> tuple[bool | None, str]:

    """
    Optional Docker execution verification.
    Disabled by default. This is basic isolation,
    not a formally secure sandbox.
    """

    enabled = os.getenv(
        "SKILLBRIDGE_ENABLE_DOCKER_VERIFY",
        "false",
    ).lower()

    if enabled not in {"1", "true", "yes"}:
        return None, "Docker execution verification is disabled."

    if not shutil.which("docker"):
        return None, "Docker is not installed or unavailable on PATH."

    with tempfile.TemporaryDirectory(
        prefix="skillbridge_verify_"
    ) as folder:

        script = os.path.join(folder, "student_code.py")

        with open(script, "w", encoding="utf-8") as file:
            file.write(code)

        command = [
            "docker",
            "run",
            "--rm",
            "--network", "none",
            "--memory", "128m",
            "--cpus", "0.5",
            "--pids-limit", "64",
            "--read-only",
            "--tmpfs", "/tmp:rw,noexec,nosuid,size=16m",
            "--cap-drop", "ALL",
            "--security-opt", "no-new-privileges",
            "--user", "65534:65534",
            "-e", "PYTHONDONTWRITEBYTECODE=1",
            "-v", f"{script}:/tmp/student_code.py:ro",
            "python:3.12-slim",
            "python",
            "/tmp/student_code.py",
        ]

        try:
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=6,
                check=False,
            )

        except subprocess.TimeoutExpired:
            return False, "Execution timed out after 6 seconds."

        except OSError as exc:
            return None, f"Could not start Docker: {exc}"

        if result.returncode == 0:

            output = result.stdout.strip()

            if output:
                return (
                    True,
                    f"Execution completed. Output: {output[:1500]}",
                )

            return (
                True,
                "Execution completed without errors; no output was printed.",
            )

        error = (
            result.stderr or result.stdout
        ).strip()

        return False, f"Execution failed: {error[:1500]}"


# ==================================================
# SAFE ARITHMETIC EXPRESSION EVALUATION
# ==================================================

def safe_calculate_expression(expression: str):

    """
    Safely calculate basic arithmetic expressions.
    Supports +, -, *, /, //, %, and **.
    Does not use eval().
    """

    try:
        tree = ast.parse(expression, mode="eval")

    except (SyntaxError, ValueError):
        raise ValueError("Invalid arithmetic expression.")

    def calculate(node):

        if isinstance(node, ast.Expression):
            return calculate(node.body)

        if isinstance(node, ast.Constant):

            if isinstance(node.value, (int, float)):
                return node.value

            raise ValueError("Unsupported value.")

        if isinstance(node, ast.UnaryOp):

            value = calculate(node.operand)

            if isinstance(node.op, ast.UAdd):
                return value

            if isinstance(node.op, ast.USub):
                return -value

            raise ValueError("Unsupported unary operator.")

        if isinstance(node, ast.BinOp):

            left = calculate(node.left)
            right = calculate(node.right)

            if isinstance(node.op, ast.Add):
                return left + right

            if isinstance(node.op, ast.Sub):
                return left - right

            if isinstance(node.op, ast.Mult):
                return left * right

            if isinstance(node.op, ast.Div):
                return left / right

            if isinstance(node.op, ast.FloorDiv):
                return left // right

            if isinstance(node.op, ast.Mod):
                return left % right

            if isinstance(node.op, ast.Pow):

                if abs(right) > 100:
                    raise ValueError("Exponent is too large.")

                return left ** right

            raise ValueError("Unsupported arithmetic operator.")

        raise ValueError("Unsupported expression.")

    result = calculate(tree)

    if isinstance(result, complex):
        raise ValueError("Complex results are not supported.")

    return result


# ==================================================
# FIND ARITHMETIC MISMATCHES
# ==================================================

def find_arithmetic_mismatches(answer: str) -> list[str]:

    """
    Detect simple arithmetic equations in an AI response.
    """

    mismatches = []

    pattern = re.compile(
        r"(?<![A-Za-z0-9_])"
        r"([-+]?\d+(?:\.\d+)?"
        r"(?:\s*(?:\*\*|//|[+\-*/%])\s*"
        r"[-+]?\d+(?:\.\d+)?)+)"
        r"\s*=\s*"
        r"([-+]?\d+(?:\.\d+)?)"
    )

    for match in pattern.finditer(answer):

        expression = match.group(1)
        displayed_result = match.group(2)

        try:
            actual_result = safe_calculate_expression(expression)
            expected_result = float(displayed_result)

            if not abs(float(actual_result) - expected_result) < 1e-9:

                mismatches.append(
                    f"{expression} = {displayed_result} is incorrect. "
                    f"Correct result: {actual_result}"
                )

        except (
            ValueError,
            ZeroDivisionError,
            OverflowError,
        ):
            continue

    return mismatches


# ==================================================
# VERIFY AND REPAIR ARITHMETIC
# ==================================================

async def verify_and_repair_answer(
    answer: str,
    question: str,
) -> str:

    mismatches = find_arithmetic_mismatches(answer)

    if not mismatches:
        return answer

    mismatch_text = "\n".join(
        f"- {item}" for item in mismatches
    )

    repair_prompt = f"""
The following answer contains arithmetic mistakes.

ORIGINAL USER QUESTION:
{question}

CURRENT ANSWER:
{answer}

DETECTED ARITHMETIC ERRORS:
{mismatch_text}

Your task:
1. Recheck the calculations.
2. Correct every incorrect numerical result.
3. Make sure the explanation and final answer agree.
4. Preserve the original answer's useful structure.
5. Do not invent new facts.
6. Return only the corrected answer.
"""

    try:
        repaired = await ask_ollama(
            repair_prompt,
            num_predict=1200,
            system_prompt=(
                "You are a careful mathematics and programming tutor. "
                "Verify every calculation before responding. "
                "Never repeat an incorrect arithmetic result."
            ),
        )

        repaired = clean_chat_answer(repaired)

        remaining_errors = find_arithmetic_mismatches(repaired)

        if remaining_errors:
            return (
                repaired
                + "\n\nNote: Some arithmetic expressions "
                "could not be verified automatically."
            )

        return repaired

    except Exception:
        return (
            answer
            + "\n\nNote: An arithmetic inconsistency was detected, "
            "but automatic correction could not be completed."
        )
# ==================================================
# AI MENTOR SYSTEM PROMPT
# ==================================================

MENTOR_SYSTEM_PROMPT = """
You are SkillBridgePro AI Mentor, a knowledgeable and practical
programming and interview preparation tutor.

Your responsibility is to help students understand concepts,
solve programming problems, prepare for interviews, and improve
their technical skills.

GENERAL RULES:

1. Understand the user's exact question before answering.
2. Give accurate, relevant and practical answers.
3. Do not invent facts, functions, APIs or outputs.
4. If you are unsure, clearly mention the uncertainty.
5. Explain concepts in simple language when appropriate.
6. Use examples that are relevant to the question.
7. Do not give unrelated information.
8. Keep the response organized and readable.
9. Verify calculations before presenting numerical answers.
10. Ensure code examples and explanations are consistent.

PROGRAMMING RULES:

1. Identify the programming language requested.
2. Use only that language unless the user requests otherwise.
3. If the user asks for JavaScript, provide JavaScript.
4. Do not use React, JSX or HTML unless requested.
5. If the user asks for Python, provide Python code.
6. Avoid unnecessary frameworks and libraries.
7. Explain the logic step by step when useful.
8. Include expected output when appropriate.
9. Consider edge cases.
10. Do not claim code is tested unless it has actually been executed.

COMPLETE CODE REQUIREMENTS:

1. Provide complete, executable code.
2. Include every required import.
3. Define functions before calling them in examples.
4. Do not use placeholders such as "write your code here".
5. Do not omit important parts of the solution.
6. Include input handling when appropriate.
7. Include sample input and output.
8. Ensure variable names are consistent.
9. Check that the explanation matches the actual code.

INTERVIEW PREPARATION:

1. Provide interview-ready explanations.
2. Include examples where useful.
3. Distinguish beginner, intermediate and advanced concepts.
4. Avoid unnecessarily complicated explanations.
5. Focus on practical understanding.

RESPONSE FORMAT:

Use headings, bullet points and code blocks when helpful.

For programming questions, prefer this structure:

- Explanation
- Logic
- Code
- Example output
- Time and space complexity, when relevant

Do not force this structure for simple questions.
"""


# ==================================================
# LANGUAGE DETECTION
# ==================================================

def detect_programming_language(question: str) -> str:
    """
    Detect the programming language requested by the user.
    Defaults to Python when no language is specified.
    """

    text = question.lower()

    language_patterns = [
        (r"\b(javascript|js)\b", "javascript"),
        (r"\b(java)\b", "java"),
        (r"\b(c\+\+|cpp)\b", "cpp"),
        (r"\b(python|py)\b", "python"),
        (r"\b(sql)\b", "sql"),
        (r"\b(html)\b", "html"),
        (r"\b(css)\b", "css"),
        (r"\b(c language|program in c|using c)\b", "c"),
    ]

    for pattern, language in language_patterns:
        if re.search(pattern, text):
            return language

    return "python"


# ==================================================
# PROGRAMMING QUESTION DETECTION
# ==================================================

def is_programming_question(question: str) -> bool:
    """
    Determine whether the user is asking for a programming solution.
    """

    text = question.lower()

    patterns = [
        r"\bwrite\s+(a\s+)?(python|javascript|java|c|sql)?\s*(program|code|function)\b",
        r"\b(create|implement|build)\s+(a\s+)?(program|function|script|code)\b",
        r"\b(program|code)\s+to\b",
        r"\bhow\s+to\s+(write|implement|code)\b",
        r"\b(factorial|prime number|palindrome|armstrong|fibonacci)\b",
        r"\b(sum of digits|multiplication table|even numbers)\b",
        r"\bdebug\s+this\b",
        r"\bfix\s+this\s+code\b",
    ]

    return any(
        re.search(pattern, text)
        for pattern in patterns
    )


# ==================================================
# NORMAL AI MENTOR CHAT
# ==================================================

async def generate_mentor_answer(
    question: str,
    conversation_history=None,
) -> str:

    if not question or not question.strip():
        return "Please enter a question."

    # Route programming questions to the programming generator.
    if is_programming_question(question):

        language = detect_programming_language(question)

        return await generate_programming_answer(
            question=question,
            language=language,
        )

    history_text = ""

    if conversation_history:

        history_text = "\n\nPREVIOUS CONVERSATION:\n"

        for message in conversation_history[-8:]:

            if not isinstance(message, dict):
                continue

            role = str(
                message.get("role", "user")
            ).lower()

            if role not in {"user", "assistant"}:
                continue

            content = str(
                message.get("content", "")
            ).strip()

            if not content:
                continue

            history_text += (
                f"\n{role.upper()}: {content[:2000]}"
            )

    prompt = f"""
{history_text}

CURRENT USER QUESTION:

{question}

Answer the current question directly.

Important:
- Follow the requested programming language.
- Do not introduce unrelated frameworks.
- Check calculations and code carefully.
- Explain concepts clearly.
- Use examples when they improve understanding.
- Keep the answer relevant to the question.
"""

    answer = await ask_ollama(
        prompt,
        num_predict=1800,
        system_prompt=MENTOR_SYSTEM_PROMPT,
    )

    answer = clean_chat_answer(answer)

    answer = await verify_and_repair_answer(
        answer=answer,
        question=question,
    )

    return answer
    # ==================================================
# PROGRAMMING QUESTION ANSWER
# ==================================================

async def generate_programming_answer(
    question: str,
    language: str = "python",
) -> str:

    if not question or not question.strip():
        return "Please enter a programming question."

    language = (language or "python").strip().lower()

    allowed_languages = {
        "python",
        "javascript",
        "java",
        "c",
        "cpp",
        "sql",
        "html",
        "css",
    }

    if language not in allowed_languages:
        language = "python"

    prompt = f"""
USER QUESTION:
{question}

REQUESTED PROGRAMMING LANGUAGE:
{language}

IMPORTANT INSTRUCTIONS:

1. Solve the problem using {language}.
2. Do not change the requested language.
3. Give a simple and understandable solution.
4. Explain the logic step by step.
5. Include the COMPLETE code.
6. The code must be executable, not pseudocode.
7. Include all required imports.
8. Define every function before calling it.
9. Never call an undefined function.
10. Do not leave out any part of the solution.
11. Include input handling when appropriate.
12. Include sample input and output.
13. Handle important edge cases.
14. Do not use unnecessary frameworks.
15. Do not use React or JSX unless explicitly requested.
16. Verify the explanation against the code.

Before responding, mentally trace the code from the first line
to the last line.

Check:
- Are all variables defined?
- Are all functions defined?
- Are all imports included?
- Does the code produce the expected output?
- Does the example match the requested problem?

For Python, always provide a complete runnable example.
"""

    answer = await ask_ollama(
        prompt,
        num_predict=2200,
        system_prompt=MENTOR_SYSTEM_PROMPT,
    )

    answer = clean_chat_answer(answer)

    answer = await verify_and_repair_answer(
        answer,
        question,
    )

    # Python code verification
    if language == "python":

        code_blocks = extract_code_blocks(
            answer,
            "python",
        )

        if code_blocks:

            code = code_blocks[0]

            valid, message = verify_python_syntax(code)

            if not valid:

                repair_prompt = f"""
The Python code below has a syntax error.

ORIGINAL QUESTION:
{question}

CURRENT ANSWER:
{answer}

SYNTAX ERROR:
{message}

Rewrite the ENTIRE answer.

Requirements:
- Fix the syntax error.
- Include every required import.
- Define all functions.
- Include complete executable code.
- Include sample input and output.
- Do not omit any code.
- Return the complete corrected answer.
"""

                try:
                    repaired = await ask_ollama(
                        repair_prompt,
                        num_predict=2000,
                        system_prompt=MENTOR_SYSTEM_PROMPT,
                    )

                    answer = clean_chat_answer(repaired)

                except Exception:
                    answer += (
                        f"\n\n**Verification warning:** {message}"
                    )

            else:

                # Check for likely undefined function calls.
                undefined_functions = find_undefined_function_calls(
                    code
                )

                if undefined_functions:

                    repair_prompt = f"""
Your previous Python answer contains function calls
that do not appear to be defined or imported.

Possible undefined functions:
{", ".join(undefined_functions)}

ORIGINAL QUESTION:
{question}

PREVIOUS ANSWER:
{answer}

Rewrite the ENTIRE answer.

Requirements:
- Define every function before calling it.
- Include all imports.
- Include complete executable Python code.
- Include input handling when appropriate.
- Include sample input and output.
- Do not omit any code.
- Do not use undefined functions.
- Return the complete corrected answer.
"""

                    try:
                        repaired = await ask_ollama(
                            repair_prompt,
                            num_predict=2200,
                            system_prompt=MENTOR_SYSTEM_PROMPT,
                        )

                        answer = clean_chat_answer(repaired)

                    except Exception:
                        answer += (
                            "\n\nNote: Automatic function verification "
                            "could not complete."
                        )

    return answer


# ==================================================
# INTERVIEW QUESTION GENERATION
# ==================================================

async def generate_interview_questions(
    skills: list[str],
    count: int = 8,
    difficulty: str = "intermediate",
) -> list[dict]:

    skills = [
        str(skill).strip()
        for skill in skills
        if str(skill).strip()
    ]

    if not skills:
        return []

    count = max(1, min(int(count), 20))

    prompt = f"""
Generate {count} interview questions for these skills:

{", ".join(skills)}

Difficulty: {difficulty}

Requirements:
- Questions must be relevant to the given skills.
- Avoid duplicate questions.
- Include a mixture of conceptual and practical questions.
- Include a short expected answer for each question.

Return valid JSON in this exact structure:

{{
    "questions": [
        {{
            "question": "Question text",
            "skill": "Python",
            "difficulty": "intermediate",
            "expected_answer": "Short answer"
        }}
    ]
}}

Return only JSON.
"""

    response = await ask_ollama(
        prompt,
        json_mode=True,
        num_predict=2500,
        system_prompt=(
            "You are an experienced technical interviewer. "
            "Generate accurate and relevant interview questions. "
            "Return valid JSON only."
        ),
    )

    data = parse_json_response(response)

    questions = data.get("questions", [])

    if not isinstance(questions, list):
        return []

    return [
        item
        for item in questions[:count]
        if isinstance(item, dict)
        and item.get("question")
    ]


# ==================================================
# INTERVIEW ANSWER EVALUATION
# ==================================================

async def evaluate_interview_answer(
    question: str,
    expected_answer: str,
    student_answer: str,
) -> dict:

    prompt = f"""
Evaluate the student's interview answer.

QUESTION:
{question}

EXPECTED ANSWER:
{expected_answer}

STUDENT ANSWER:
{student_answer}

Evaluate:

1. Technical correctness
2. Completeness
3. Clarity
4. Important missing points

Return valid JSON:

{{
    "score": 0,
    "feedback": "Detailed feedback",
    "strengths": [],
    "improvements": [],
    "ideal_answer": "A better interview-ready answer"
}}

Score must be between 0 and 10.

Do not give a high score to an incorrect answer.
"""

    response = await ask_ollama(
        prompt,
        json_mode=True,
        num_predict=1500,
        system_prompt=(
            "You are a fair and experienced technical interviewer. "
            "Evaluate answers accurately and constructively."
        ),
    )

    data = parse_json_response(response)

    try:
        score = float(data.get("score", 0))

    except (ValueError, TypeError):
        score = 0

    data["score"] = max(0, min(10, score))

    return data


# ==================================================
# PERSONALIZED STUDY GUIDE
# ==================================================

async def generate_study_guide(
    skills: list[str],
    missing_skills: list[str] | None = None,
) -> str:

    skills = skills or []
    missing_skills = missing_skills or []

    prompt = f"""
Create a personalized study guide.

CURRENT SKILLS:
{", ".join(skills) if skills else "Not provided"}

MISSING SKILLS:
{", ".join(missing_skills) if missing_skills else "Not provided"}

Include:

1. Learning roadmap.
2. Topics to study.
3. Practical exercises.
4. Mini-project suggestions.
5. Interview preparation topics.
6. Recommended learning order.

Make the guide practical and beginner-friendly.
"""

    response = await ask_ollama(
        prompt,
        num_predict=2500,
        system_prompt=(
            "You are a technical learning mentor. "
            "Create practical and personalized study guides."
        ),
    )

    return clean_chat_answer(response)
    # ==================================================
# MAIN.PY COMPATIBILITY FUNCTIONS
# ==================================================

async def prepare_study_guide(payload: dict) -> dict:
    """Generate and validate a personalized study guide."""

    if not isinstance(payload, dict):
        raise ValueError("Invalid study guide request.")

    job = payload.get("job") or {}

    if not isinstance(job, dict):
        job = {}

    skills = payload.get("requiredSkills") or []
    missing = payload.get("missingSkills") or []

    if not isinstance(skills, list):
        skills = []

    if not isinstance(missing, list):
        missing = []

    skills = [str(s) for s in skills[:10]]
    missing = [str(s) for s in missing[:10]]

    priority_skills = missing or skills

    try:
        days = int(payload.get("studyDays", 7))
    except (ValueError, TypeError):
        days = 7

    days = max(1, min(days, 14))

    prompt = f"""
You are SkillBridge AI, a technical study planner.

Create a complete personalized study guide.

Job: {job.get("title", "General Preparation")}
Required skills: {json.dumps(skills)}
Missing skills: {json.dumps(missing)}
Study duration: EXACTLY {days} days.

Prioritize missing skills. Cover the supplied skills only.

Return valid JSON with this exact structure:

{{
    "title": "Personalized Study Plan",
    "summary": "Study plan summary",
    "studyPlan": [
        {{
            "day": 1,
            "title": "Study topic",
            "tasks": ["Task one", "Task two"]
        }}
    ],
    "topics": [
        {{
            "name": "Topic name",
            "explanation": "Detailed beginner-friendly explanation",
            "keyPoints": ["Point one", "Point two"]
        }}
    ],
    "questions": [
        {{
            "question": "Interview question",
            "answer": "Detailed correct answer",
            "difficulty": "Beginner"
        }}
    ],
    "finalAssessment": [
        {{
            "question": "Assessment question",
            "answer": "Correct answer with explanation"
        }}
    ]
}}

MANDATORY:
- Exactly {days} studyPlan entries.
- At least 3 topics with actual explanations.
- At least 5 interview questions with answers.
- At least 3 assessment questions with answers.
- Include practical exercises.
- Cover the supplied skills and prioritize missing skills.
- Do not introduce unrelated technologies.
- Return JSON only.
"""

    result = None

    for attempt in range(2):
        response = await ask_ollama(
            prompt,
            json_mode=True,
            num_predict=2000,
            system_prompt=(
                "You are a precise technical study planner. "
                "Follow the requested JSON schema and all quantity "
                "requirements. Never omit requested sections."
            ),
        )

        data = parse_json_response(response)

        required_sections = (
            "studyPlan",
            "topics",
            "questions",
            "finalAssessment",
        )

        for key in required_sections:
            if not isinstance(data.get(key), list):
                data[key] = []

        complete = (
            len(data["studyPlan"]) == days
            and len(data["topics"]) >= 3
            and len(data["questions"]) >= 5
            and len(data["finalAssessment"]) >= 3
        )

        result = data

        if complete:
            break

        prompt += f"""

CORRECTION REQUIRED:

Your previous response was incomplete.

You must return:
- Exactly {days} study days.
- At least 3 topics.
- At least 5 interview questions.
- At least 3 assessment questions.

Return the complete JSON object. Do not omit any section.
"""

    # Ensure exactly the requested number of study days.
    study_plan = result["studyPlan"][:days]

    for day_number in range(len(study_plan) + 1, days + 1):
        skill = (
            priority_skills[(day_number - 1) % len(priority_skills)]
            if priority_skills else "Technical fundamentals"
        )

        study_plan.append({
            "day": day_number,
            "title": f"{skill} - Practical Revision",
            "tasks": [
                f"Revise important {skill} concepts.",
                f"Complete practical exercises related to {skill}."
            ]
        })

    result["studyPlan"] = study_plan

    # Add fallback interview questions if required.
    while len(result["questions"]) < 5:
        skill = (
            priority_skills[len(result["questions"]) % len(priority_skills)]
            if priority_skills else "technical concepts"
        )

        result["questions"].append({
            "question": f"Explain the important concepts of {skill}.",
            "answer": (
                f"Describe the purpose of {skill}, its main concepts, "
                "practical applications and a relevant example."
            ),
            "difficulty": "Beginner"
        })

    # Add fallback assessment questions if required.
    while len(result["finalAssessment"]) < 3:
        skill = (
            priority_skills[
                len(result["finalAssessment"]) % len(priority_skills)
            ]
            if priority_skills else "technical concepts"
        )

        result["finalAssessment"].append({
            "question": f"Describe how you would apply {skill} in a practical task.",
            "answer": (
                f"Explain the relevant {skill} concepts and demonstrate "
                "their application with a practical example."
            )
        })

    result.setdefault("title", "Personalized Study Plan")
    result.setdefault("summary", "Your personalized preparation plan")
    result["generatedBy"] = OLLAMA_MODEL

    return result


# ==================================================
# AI MENTOR CHAT HANDLER
# ==================================================

async def chat_with_mentor(payload: dict) -> dict:
    """Handle Student AI Mentor chat requests."""

    if not isinstance(payload, dict):
        raise ValueError("Invalid chat request.")

    message = (payload.get("message") or "").strip()

    if not message:
        return {"answer": "Please enter a question."}

    history = payload.get("history") or []

    answer = await generate_mentor_answer(
        question=message,
        conversation_history=history
    )

    return {"answer": answer}