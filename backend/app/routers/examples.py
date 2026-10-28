from fastapi import APIRouter, Query

from app.schemas import ExampleOut
from app.services.examples import list_examples

router = APIRouter(prefix="/examples", tags=["examples"])


@router.get("", response_model=list[ExampleOut])
def get_examples(
    q: str | None = Query(default=None, max_length=100),
    category: str | None = Query(default=None, max_length=80),
) -> list[ExampleOut]:
    return list_examples(query=q, category=category)
