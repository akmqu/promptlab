import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import httpx

from app.services.gemini import _generate_content_with_retry


def test_generate_content_retries_transient_read_error():
    response = SimpleNamespace(text='{"ok": true}')
    generate_content = AsyncMock(
        side_effect=[httpx.ReadError("connection closed"), response]
    )
    client = SimpleNamespace(
        aio=SimpleNamespace(
            models=SimpleNamespace(generate_content=generate_content)
        )
    )

    with patch("app.services.gemini.asyncio.sleep", new=AsyncMock()):
        result = asyncio.run(
            _generate_content_with_retry(
                client=client,
                model="gemini-3.5-flash-lite",
                contents="test",
                config=None,
            )
        )

    assert result is response
    assert generate_content.await_count == 2
