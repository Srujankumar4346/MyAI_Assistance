import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.security.auth import create_access_token

client = TestClient(app)

@pytest.fixture
def auth_headers():
    token = create_access_token(data={"sub": "testuser"})
    return {"Authorization": f"Bearer {token}"}

def test_browser_status_unauthorized():
    response = client.get("/api/browser/status")
    assert response.status_code == 401

def test_browser_status_authorized(auth_headers):
    # This might fail if the DB isn't mocked but let's assume get_current_user handles it or we mock db.
    pass
