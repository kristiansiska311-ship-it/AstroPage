"""AI-prompt settings endpoints — hermetic (DB session mocked in conftest)."""


def test_get_ai_prompt_requires_auth(client):
    assert client.get("/api/v1/settings/ai-prompt").status_code == 401


def test_get_ai_prompt_defaults_to_null(auth_client):
    res = auth_client.get("/api/v1/settings/ai-prompt")
    assert res.status_code == 200
    assert res.json() == {"custom_ai_prompt": None}


def test_put_ai_prompt_updates_user(auth_client, fake_user):
    res = auth_client.put(
        "/api/v1/settings/ai-prompt", json={"custom_ai_prompt": "Explain like I'm 12."}
    )
    assert res.status_code == 200
    assert res.json() == {"custom_ai_prompt": "Explain like I'm 12."}
    assert fake_user.custom_ai_prompt == "Explain like I'm 12."


def test_put_blank_prompt_clears_it(auth_client, fake_user):
    fake_user.custom_ai_prompt = "old"
    res = auth_client.put("/api/v1/settings/ai-prompt", json={"custom_ai_prompt": "   "})
    assert res.status_code == 200
    assert res.json() == {"custom_ai_prompt": None}
    assert fake_user.custom_ai_prompt is None
