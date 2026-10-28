from __future__ import annotations

import json

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user_optional
from app.models import PromptSession, PromptVariant, User
from app.schemas import (
    PromptAnalyzeRequest,
    PromptAnalyzeResponse,
    PromptEvaluateRequest,
    PromptEvaluateResponse,
    PromptGenerateRequest,
    PromptGenerateResponse,
    PromptRefineRequest,
    PromptRefineResponse,
    PromptVariantOut,
    ScoreItem,
)
from app.services.gemini import generate_structured

router = APIRouter(prefix="/prompts", tags=["prompts"])


class _AnalysisLLM(BaseModel):
    summary: str
    issues: list[dict] = Field(default_factory=list)
    missing_context: list[str] = Field(default_factory=list)
    missing_constraints: list[str] = Field(default_factory=list)
    ambiguity: list[str] = Field(default_factory=list)
    expected_format: str | None = None
    hallucination_risks: list[str] = Field(default_factory=list)
    clarifying_questions: list[str] = Field(default_factory=list)


class _VariantsLLM(BaseModel):
    variants: list[PromptVariantOut]


class _RefineLLM(BaseModel):
    content: str


class _EvalLLM(BaseModel):
    scores: list[ScoreItem]


@router.post("/analyze", response_model=PromptAnalyzeResponse)
async def analyze_prompt(payload: PromptAnalyzeRequest) -> PromptAnalyzeResponse:
    task = (
        "Przeanalizuj poniższy prompt użytkownika po polsku. "
        "Wskaż jasność celu, brakujący kontekst, brakujące ograniczenia, niejednoznaczności, "
        "oczekiwany format odpowiedzi i ryzyka halucynacji. "
        "Zwróć maksymalnie 3 konkretne pytania doprecyzowujące.\n\n"
        f"Kategoria: {payload.category or 'brak'}\n"
        f"Kontekst: {payload.context or 'brak'}\n"
        f"Prompt:\n{payload.prompt}"
    )
    raw = await generate_structured(user_prompt=task, schema=_AnalysisLLM, temperature=0.3)
    data = PromptAnalyzeResponse.model_validate(
        {
            **raw.model_dump(),
            "issues": [
                {"area": i.get("area", "Ogólne"), "detail": i.get("detail", "")}
                for i in raw.issues
                if isinstance(i, dict)
            ][:6],
            "clarifying_questions": [q for q in raw.clarifying_questions if q.strip()][:3],
        }
    )
    return data


@router.post("/generate", response_model=PromptGenerateResponse)
async def generate_variants(
    payload: PromptGenerateRequest,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
) -> PromptGenerateResponse:
    answers = "\n".join(
        f"- P: {a.question}\n  O: {a.answer or '(pominięto)'}" for a in payload.answers
    ) or "(brak odpowiedzi)"
    task = (
        "Na podstawie oryginalnego promptu i odpowiedzi użytkownika wygeneruj 3 RÓŻNE warianty:\n"
        "1) style=krotki, name=Krótki — zwięzły i bezpośredni\n"
        "2) style=rozbudowany, name=Rozbudowany — rola, kontekst, zadanie, ograniczenia, format\n"
        "3) style=krok_po_kroku, name=Krok po kroku — struktura kroków i przykłady jeśli pomocne\n"
        "Każdy wariant musi mieć explanation (kiedy użyć) oraz pełną treść content po polsku.\n\n"
        f"Kategoria: {payload.category or 'brak'}\n"
        f"Kontekst: {payload.context or 'brak'}\n"
        f"Oryginalny prompt:\n{payload.prompt}\n\n"
        f"Odpowiedzi doprecyzowujące:\n{answers}"
    )
    raw = await generate_structured(user_prompt=task, schema=_VariantsLLM, temperature=0.55)
    variants = raw.variants[:3]
    session_id = None
    if payload.save and user is not None:
        title = payload.prompt.strip()[:80] or "Sesja promptu"
        session = PromptSession(
            user_id=user.id,
            title=title,
            category=payload.category,
            original_prompt=payload.prompt,
            context=payload.context,
            clarifying_json=json.dumps(
                [a.model_dump() for a in payload.answers], ensure_ascii=False
            ),
        )
        db.add(session)
        db.flush()
        for variant in variants:
            db.add(
                PromptVariant(
                    session_id=session.id,
                    name=variant.name,
                    style=variant.style,
                    explanation=variant.explanation,
                    content=variant.content,
                )
            )
        db.commit()
        db.refresh(session)
        session_id = session.id
    return PromptGenerateResponse(variants=variants, session_id=session_id)


REFINE_INSTRUCTIONS = {
    "skroc": "Skróć prompt, zachowując sens i kluczowe wymagania. Usuń zbędne słowa.",
    "formalny": "Zmień ton promptu na formalny i profesjonalny, bez zmiany celu.",
    "ograniczenia": "Dodaj konkretne, praktyczne ograniczenia (zakres, długość, format, wykluczenia).",
    "halucynacje": (
        "Dodaj instrukcje ograniczające ryzyko halucynacji: wymagaj źródeł/założeń, "
        "oznaczania niepewności i unikania wymyślonych faktów."
    ),
}


@router.post("/refine", response_model=PromptRefineResponse)
async def refine_prompt(payload: PromptRefineRequest) -> PromptRefineResponse:
    instruction = REFINE_INSTRUCTIONS[payload.action]
    task = (
        f"Zmodyfikuj poniższy prompt według instrukcji: {instruction}\n"
        "Zwróć tylko poprawioną pełną treść promptu w polu content.\n\n"
        f"Prompt:\n{payload.prompt}"
    )
    raw = await generate_structured(user_prompt=task, schema=_RefineLLM, temperature=0.35)
    return PromptRefineResponse(content=raw.content.strip(), action=payload.action)


@router.post("/evaluate", response_model=PromptEvaluateResponse)
async def evaluate_prompts(payload: PromptEvaluateRequest) -> PromptEvaluateResponse:
    task = (
        "Oceń oba prompty w skali 1-10 dla kryteriów: "
        "Jasność celu, Kontekst, Precyzja instrukcji, Format odpowiedzi, Kompletność. "
        "Zwróć scores jako listę obiektów z criterion, original, improved, note. "
        "Pamiętaj, że to szacunki modelu.\n\n"
        f"ORYGINAŁ:\n{payload.original_prompt}\n\n"
        f"ULEPSZONY:\n{payload.improved_prompt}"
    )
    raw = await generate_structured(user_prompt=task, schema=_EvalLLM, temperature=0.2)
    return PromptEvaluateResponse(scores=raw.scores)
