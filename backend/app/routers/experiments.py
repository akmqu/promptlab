from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.deps import get_current_user
from app.models import Experiment, ExperimentVersion, User
from app.schemas import (
    ExperimentCreate,
    ExperimentEvaluateRequest,
    ExperimentEvaluateResponse,
    ExperimentOut,
    ExperimentScoreRow,
    ExperimentUpdate,
    MessageOut,
)
from app.services.gemini import generate_structured

router = APIRouter(prefix="/experiments", tags=["experiments"])

DEFAULT_CRITERIA = [
    "Jasność celu",
    "Kontekst",
    "Precyzja instrukcji",
    "Format odpowiedzi",
    "Kompletność",
]


class _ExpEvalLLM(BaseModel):
    rows: list[ExperimentScoreRow] = Field(default_factory=list)


def _to_out(exp: Experiment) -> ExperimentOut:
    return ExperimentOut(
        id=exp.id,
        title=exp.title,
        criteria=json.loads(exp.criteria_json),
        evaluation_json=exp.evaluation_json,
        created_at=exp.created_at,
        updated_at=exp.updated_at,
        versions=list(exp.versions),
    )


def _get_owned(db: Session, user: User, experiment_id: int) -> Experiment:
    exp = db.scalar(
        select(Experiment)
        .where(Experiment.id == experiment_id, Experiment.user_id == user.id)
        .options(selectinload(Experiment.versions))
    )
    if exp is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Eksperyment nie istnieje")
    return exp


@router.get("", response_model=list[ExperimentOut])
def list_experiments(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[ExperimentOut]:
    rows = db.scalars(
        select(Experiment)
        .where(Experiment.user_id == user.id)
        .options(selectinload(Experiment.versions))
        .order_by(Experiment.created_at.desc())
    ).all()
    return [_to_out(r) for r in rows]


@router.post("", response_model=ExperimentOut, status_code=status.HTTP_201_CREATED)
def create_experiment(
    payload: ExperimentCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ExperimentOut:
    exp = Experiment(
        user_id=user.id,
        title=payload.title.strip(),
        criteria_json=json.dumps(payload.criteria or DEFAULT_CRITERIA, ensure_ascii=False),
    )
    db.add(exp)
    db.flush()
    for version in payload.versions:
        db.add(
            ExperimentVersion(
                experiment_id=exp.id,
                label=version.label,
                content=version.content,
            )
        )
    db.commit()
    return _to_out(_get_owned(db, user, exp.id))


@router.get("/{experiment_id}", response_model=ExperimentOut)
def get_experiment(
    experiment_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ExperimentOut:
    return _to_out(_get_owned(db, user, experiment_id))


@router.put("/{experiment_id}", response_model=ExperimentOut)
def update_experiment(
    experiment_id: int,
    payload: ExperimentUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ExperimentOut:
    exp = _get_owned(db, user, experiment_id)
    if payload.title is not None:
        exp.title = payload.title.strip()
    if payload.criteria is not None:
        exp.criteria_json = json.dumps(payload.criteria, ensure_ascii=False)
    if payload.versions is not None:
        for old in list(exp.versions):
            db.delete(old)
        db.flush()
        for version in payload.versions:
            db.add(
                ExperimentVersion(
                    experiment_id=exp.id,
                    label=version.label,
                    content=version.content,
                )
            )
    db.commit()
    return _to_out(_get_owned(db, user, experiment_id))


@router.delete("/{experiment_id}", response_model=MessageOut)
def delete_experiment(
    experiment_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageOut:
    exp = _get_owned(db, user, experiment_id)
    db.delete(exp)
    db.commit()
    return MessageOut(message="Eksperyment usunięty")


@router.post("/{experiment_id}/evaluate", response_model=ExperimentEvaluateResponse)
async def evaluate_experiment(
    experiment_id: int,
    payload: ExperimentEvaluateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ExperimentEvaluateResponse:
    exp = _get_owned(db, user, experiment_id)
    criteria = payload.criteria or json.loads(exp.criteria_json)
    versions_block = "\n\n".join(f"{v.label}:\n{v.content}" for v in exp.versions)
    task = (
        "Porównaj wersje promptów według podanych kryteriów w skali 1-10. "
        "Zwróć rows: lista {criterion, scores: {V1?:number,...}, feedback: {V1?:string,...}}. "
        "To szacunki modelu, nie dowód statystyczny.\n\n"
        f"Kryteria: {', '.join(criteria)}\n\n"
        f"Wersje:\n{versions_block}"
    )
    raw = await generate_structured(user_prompt=task, schema=_ExpEvalLLM, temperature=0.25)
    result = ExperimentEvaluateResponse(rows=raw.rows)
    exp.evaluation_json = result.model_dump_json()
    db.commit()
    return result
