from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


class MessageOut(BaseModel):
    message: str


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=2, max_length=120)

    @field_validator("display_name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 2:
            raise ValueError("Nazwa jest zbyt krótka")
        return cleaned


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserOut(BaseModel):
    id: int
    email: EmailStr
    display_name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class PromptAnalyzeRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=2000)
    category: str | None = Field(default=None, max_length=80)
    context: str | None = Field(default=None, max_length=1000)

    @field_validator("prompt", "context", "category")
    @classmethod
    def strip_optional(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class AnalysisIssue(BaseModel):
    area: str
    detail: str


class PromptAnalyzeResponse(BaseModel):
    summary: str
    issues: list[AnalysisIssue]
    missing_context: list[str]
    missing_constraints: list[str]
    ambiguity: list[str]
    expected_format: str | None = None
    hallucination_risks: list[str]
    clarifying_questions: list[str] = Field(max_length=3)


class ClarifyingAnswer(BaseModel):
    question: str = Field(min_length=1, max_length=300)
    answer: str = Field(default="", max_length=500)


class PromptGenerateRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=2000)
    category: str | None = Field(default=None, max_length=80)
    context: str | None = Field(default=None, max_length=1000)
    answers: list[ClarifyingAnswer] = Field(default_factory=list, max_length=3)
    save: bool = False


class PromptVariantOut(BaseModel):
    name: str
    style: Literal["krotki", "rozbudowany", "krok_po_kroku"]
    explanation: str
    content: str


class PromptGenerateResponse(BaseModel):
    variants: list[PromptVariantOut]
    session_id: int | None = None


class PromptRefineRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=4000)
    action: Literal["skroc", "formalny", "ograniczenia", "halucynacje"]


class PromptRefineResponse(BaseModel):
    content: str
    action: str


class PromptEvaluateRequest(BaseModel):
    original_prompt: str = Field(min_length=1, max_length=2000)
    improved_prompt: str = Field(min_length=1, max_length=4000)


class ScoreItem(BaseModel):
    criterion: str
    original: float = Field(ge=1, le=10)
    improved: float = Field(ge=1, le=10)
    note: str | None = None


class PromptEvaluateResponse(BaseModel):
    scores: list[ScoreItem]
    disclaimer: str = (
        "Oceny są szacunkami modelu AI, nie obiektywnymi pomiarami i mogą się różnić między uruchomieniami."
    )


class ExampleOut(BaseModel):
    id: str
    title: str
    category: str
    weak_prompt: str
    description: str


class SessionVariantOut(BaseModel):
    id: int
    name: str
    style: str
    explanation: str
    content: str

    model_config = {"from_attributes": True}


class SessionCreate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    category: str | None = Field(default=None, max_length=80)
    original_prompt: str = Field(min_length=1, max_length=2000)
    context: str | None = Field(default=None, max_length=1000)
    analysis_json: str | None = None
    clarifying_json: str | None = None
    evaluation_json: str | None = None
    variants: list[PromptVariantOut] = Field(default_factory=list)
    selected_variant_index: int | None = None


class SessionUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    selected_variant_id: int | None = None
    evaluation_json: str | None = None
    clarifying_json: str | None = None


class SessionOut(BaseModel):
    id: int
    title: str
    category: str | None
    original_prompt: str
    context: str | None
    analysis_json: str | None
    clarifying_json: str | None
    evaluation_json: str | None
    selected_variant_id: int | None
    created_at: datetime
    updated_at: datetime
    variants: list[SessionVariantOut]

    model_config = {"from_attributes": True}


class SessionSummaryOut(BaseModel):
    id: int
    title: str
    category: str | None
    original_prompt: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ExperimentVersionIn(BaseModel):
    label: Literal["V1", "V2", "V3"]
    content: str = Field(min_length=1, max_length=4000)


class ExperimentCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    criteria: list[str] = Field(min_length=1, max_length=8)
    versions: list[ExperimentVersionIn] = Field(min_length=1, max_length=3)


class ExperimentUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    criteria: list[str] | None = Field(default=None, max_length=8)
    versions: list[ExperimentVersionIn] | None = Field(default=None, max_length=3)


class ExperimentVersionOut(BaseModel):
    id: int
    label: str
    content: str

    model_config = {"from_attributes": True}


class ExperimentOut(BaseModel):
    id: int
    title: str
    criteria: list[str]
    evaluation_json: str | None
    created_at: datetime
    updated_at: datetime
    versions: list[ExperimentVersionOut]


class ExperimentEvaluateRequest(BaseModel):
    criteria: list[str] | None = Field(default=None, max_length=8)


class ExperimentScoreRow(BaseModel):
    criterion: str
    scores: dict[str, float]
    feedback: dict[str, str]


class ExperimentEvaluateResponse(BaseModel):
    rows: list[ExperimentScoreRow]
    disclaimer: str = (
        "Oceny są szacunkami modelu AI i mogą się różnić między uruchomieniami. "
        "Nie stanowią dowodu statystycznej przewagi."
    )
