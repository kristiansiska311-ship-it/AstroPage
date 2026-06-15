"""AI homework draft generation.

Dispatches the assignment to Claude and returns a markdown draft. The
study-assistant constraint is always part of the system prompt and the output
is always a draft for the student to review — never a finished submission.
Falls back to a deterministic template when no ANTHROPIC_API_KEY is configured
so the rest of the stack stays demoable.
"""

import logging

import anthropic

from app.core.config import settings

logger = logging.getLogger("app.ai")

MODEL = "claude-opus-4-8"
MAX_TOKENS = 16000

# Core product constraint (see CLAUDE.md): draft and explain, never just a
# final answer. Always appended; the user's custom prompt cannot remove it.
STUDY_ASSISTANT_CONSTRAINT = (
    "You are a study assistant for a secondary-school student. Draft a solution "
    "to the assignment AND explain the reasoning step by step so the student can "
    "learn from it — never produce only a bare final answer. Write the draft in "
    "markdown. End with a short checklist reminding the student to verify the "
    "work and rewrite it in their own words before submitting anything. The "
    "student must always review and own the final submission."
)

# Keep the compiled payload bounded (project rule: stay well under 100k tokens).
_MAX_ASSIGNMENT_CHARS = 50_000


class AiUnavailableError(Exception):
    """Raised when the AI provider rejects or fails the request."""

    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


def build_system_prompt(custom_prompt: str | None) -> str:
    """The student's custom rules go first; the study-assistant constraint is
    always appended so it cannot be overridden away."""
    parts: list[str] = []
    if custom_prompt and custom_prompt.strip():
        parts.append(custom_prompt.strip())
    parts.append(STUDY_ASSISTANT_CONSTRAINT)
    return "\n\n".join(parts)


def _build_user_message(subject: str | None, title: str, description: str) -> str:
    body = description.strip()[:_MAX_ASSIGNMENT_CHARS]
    return (
        f"Subject: {subject or 'unknown'}\n"
        f"Assignment title: {title}\n\n"
        f"Assignment instructions:\n{body}\n\n"
        "Draft a solution I can review and edit."
    )


def _fallback_draft(subject: str | None, title: str, description: str) -> str:
    """Deterministic offline draft so the flow works without an API key."""
    return (
        f"# {title} — Draft\n\n"
        "> AI generation is not configured on this server (no `ANTHROPIC_API_KEY`), "
        "so this is a structured starting template.\n\n"
        "## Understanding the task\n"
        f"{description.strip()[:2000]}\n\n"
        "## Draft solution\n"
        "1. Restate what the task is asking in your own words.\n"
        "2. Work through the core steps one by one.\n"
        "3. Check the result against the instructions above.\n\n"
        "## Before you submit\n"
        "- [ ] Verified the facts and numbers\n"
        "- [ ] Rewritten in your own words\n"
    )


async def generate_draft(
    subject: str | None,
    title: str,
    description: str,
    custom_prompt: str | None,
) -> str:
    """Generate a markdown homework draft. Raises AiUnavailableError on provider failure."""
    if not settings.anthropic_api_key:
        logger.info("ai draft: no API key configured, returning fallback template")
        return _fallback_draft(subject, title, description)

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    try:
        response = await client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=build_system_prompt(custom_prompt),
            messages=[
                {"role": "user", "content": _build_user_message(subject, title, description)}
            ],
        )
    except anthropic.RateLimitError:
        raise AiUnavailableError("The AI assistant is busy right now. Try again in a minute.")
    except anthropic.APIError as exc:
        logger.warning("anthropic API error: %s", type(exc).__name__)
        raise AiUnavailableError("The AI assistant is unavailable right now. Try again later.")

    if response.stop_reason == "refusal":
        raise AiUnavailableError("The AI assistant declined to draft this assignment.")

    draft = "".join(block.text for block in response.content if block.type == "text").strip()
    if not draft:
        raise AiUnavailableError("The AI assistant returned an empty draft. Try again.")
    return draft
