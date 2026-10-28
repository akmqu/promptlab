from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.deps import get_current_user
from app.models import PromptSession, PromptVariant, User
from app.schemas import (
    MessageOut,
    SessionCreate,
    SessionOut,
    SessionSummaryOut,
    SessionUpdate,
)

router = APIRouter(prefix="/history", tags=["history"])


def _get_owned_session(db: Session, user: User, session_id: int) -> PromptSession:
    session = db.scalar(
        select(PromptSession)
        .where(PromptSession.id == session_id, PromptSession.user_id == user.id)
        .options(selectinload(PromptSession.variants))
    )
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sesja nie istnieje")
    return session


@router.get("", response_model=list[SessionSummaryOut])
def list_history(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[PromptSession]:
    rows = db.scalars(
        select(PromptSession)
        .where(PromptSession.user_id == user.id)
        .order_by(PromptSession.created_at.desc())
    ).all()
    return list(rows)


@router.post("", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
def create_session(
    payload: SessionCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PromptSession:
    title = (payload.title or payload.original_prompt[:80]).strip()
    session = PromptSession(
        user_id=user.id,
        title=title,
        category=payload.category,
        original_prompt=payload.original_prompt,
        context=payload.context,
        analysis_json=payload.analysis_json,
        clarifying_json=payload.clarifying_json,
        evaluation_json=payload.evaluation_json,
    )
    db.add(session)
    db.flush()
    created_variants: list[PromptVariant] = []
    for variant in payload.variants:
        row = PromptVariant(
            session_id=session.id,
            name=variant.name,
            style=variant.style,
            explanation=variant.explanation,
            content=variant.content,
        )
        db.add(row)
        created_variants.append(row)
    db.flush()
    if payload.selected_variant_index is not None and 0 <= payload.selected_variant_index < len(created_variants):
        session.selected_variant_id = created_variants[payload.selected_variant_index].id
    db.commit()
    return _get_owned_session(db, user, session.id)


@router.get("/{session_id}", response_model=SessionOut)
def get_session(
    session_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PromptSession:
    return _get_owned_session(db, user, session_id)


@router.patch("/{session_id}", response_model=SessionOut)
def update_session(
    session_id: int,
    payload: SessionUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PromptSession:
    session = _get_owned_session(db, user, session_id)
    if payload.title is not None:
        session.title = payload.title.strip()
    if payload.selected_variant_id is not None:
        owned_ids = {v.id for v in session.variants}
        if payload.selected_variant_id not in owned_ids:
            raise HTTPException(status_code=400, detail="Wariant nie należy do tej sesji")
        session.selected_variant_id = payload.selected_variant_id
    if payload.evaluation_json is not None:
        session.evaluation_json = payload.evaluation_json
    if payload.clarifying_json is not None:
        session.clarifying_json = payload.clarifying_json
    db.commit()
    return _get_owned_session(db, user, session_id)


@router.delete("/{session_id}", response_model=MessageOut)
def delete_session(
    session_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageOut:
    session = _get_owned_session(db, user, session_id)
    db.delete(session)
    db.commit()
    return MessageOut(message="Sesja usunięta")
