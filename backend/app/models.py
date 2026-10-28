from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    sessions: Mapped[list[PromptSession]] = relationship(back_populates="user", cascade="all, delete-orphan")
    experiments: Mapped[list[Experiment]] = relationship(back_populates="user", cascade="all, delete-orphan")


class PromptSession(Base):
    __tablename__ = "prompt_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    category: Mapped[str | None] = mapped_column(String(80), nullable=True)
    original_prompt: Mapped[str] = mapped_column(Text)
    context: Mapped[str | None] = mapped_column(Text, nullable=True)
    analysis_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    clarifying_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    evaluation_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    selected_variant_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User] = relationship(back_populates="sessions")
    variants: Mapped[list[PromptVariant]] = relationship(
        back_populates="session", cascade="all, delete-orphan", order_by="PromptVariant.id"
    )


class PromptVariant(Base):
    __tablename__ = "prompt_variants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("prompt_sessions.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(80))
    style: Mapped[str] = mapped_column(String(40))
    explanation: Mapped[str] = mapped_column(Text)
    content: Mapped[str] = mapped_column(Text)

    session: Mapped[PromptSession] = relationship(back_populates="variants")


class Experiment(Base):
    __tablename__ = "experiments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    criteria_json: Mapped[str] = mapped_column(Text)
    evaluation_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User] = relationship(back_populates="experiments")
    versions: Mapped[list[ExperimentVersion]] = relationship(
        back_populates="experiment", cascade="all, delete-orphan", order_by="ExperimentVersion.label"
    )


class ExperimentVersion(Base):
    __tablename__ = "experiment_versions"
    __table_args__ = (UniqueConstraint("experiment_id", "label", name="uq_experiment_label"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    experiment_id: Mapped[int] = mapped_column(ForeignKey("experiments.id", ondelete="CASCADE"), index=True)
    label: Mapped[str] = mapped_column(String(10))
    content: Mapped[str] = mapped_column(Text)

    experiment: Mapped[Experiment] = relationship(back_populates="versions")
