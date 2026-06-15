from pydantic import BaseModel, Field


class AiPromptOut(BaseModel):
    custom_ai_prompt: str | None


class AiPromptUpdate(BaseModel):
    # Null clears the custom prompt; the base study-assistant constraint always applies.
    custom_ai_prompt: str | None = Field(default=None, max_length=4000)
