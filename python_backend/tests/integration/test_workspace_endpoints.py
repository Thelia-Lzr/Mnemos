from fastapi.testclient import TestClient

from app.main import app


def test_workspace_exposes_ai_settings_and_removes_authentication_endpoints():
    response = TestClient(app, base_url="http://localhost").get("/openapi.json")
    paths = response.json()["paths"]
    assert "/api/users/profile" in paths
    assert "/api/ai-settings" in paths
    assert "/api/ai-settings/profiles/{profile_id}/test" in paths
    assert not any(path.startswith(("/api/auth/", "/api/admin/openrouter/")) for path in paths)


def test_workbench_rejects_other_browser_origins_and_hosts():
    client = TestClient(app, base_url="http://localhost")
    assert client.put("/api/ai-settings", headers={"Origin": "https://untrusted.example"}).status_code == 403
    assert client.get("/api/ai-settings", headers={"Host": "untrusted.example"}).status_code == 400


def test_open_source_workspace_has_no_payment_or_billing_routes():
    response = TestClient(app, base_url="http://localhost").get("/openapi.json")
    paths = response.json()["paths"]
    assert not any(
        path.startswith(("/api/payment", "/api/admin/packages"))
        or "credits" in path
        or "credit-stats" in path
        for path in paths
    )
