import pytest


# from fastapi-backend/firebase.py & routers/auth.py

class FakeHTTPException(Exception):
    """Simulates fastapi.HTTPException."""
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail


# --- verify_firebase_token logic (from firebase.py) ---

def verify_firebase_token_logic(token: str, verify_fn):
    """Replicates the core logic of verify_firebase_token.
    verify_fn: mock function that returns decoded dict or raises Exception.
    """
    try:
        decoded = verify_fn(token)
        return decoded
    except Exception:
        raise FakeHTTPException(status_code=401, detail="Invalid or expired token")


# --- get_me logic (from routers/auth.py) ---

def build_get_me_response(user: dict) -> dict:
    """Replicates GET /auth/me response."""
    return {"uid": user["uid"], "email": user.get("email")}


# get_me  (TC-73 – TC-75)

class TestGetMe:
    """TC-73 to TC-75 — GET /auth/me endpoint logic."""

    def test_returns_uid_and_email_for_valid_token(self):
        """TC-73: valid token → uid + email returned."""
        user = {"uid": "ttVU1DGA30aslTvyaf3g1Z6pwNh1", "email": "owner@cafe.com"}
        result = build_get_me_response(user)
        assert result == {"uid": "ttVU1DGA30aslTvyaf3g1Z6pwNh1", "email": "owner@cafe.com"}

    def test_handles_user_without_email(self):
        """Extension: some Firebase tokens may not have email."""
        user = {"uid": "user-no-email"}
        result = build_get_me_response(user)
        assert result["uid"] == "user-no-email"
        assert result["email"] is None


#  — verify_firebase_token  (TC-76 – TC-77)

class TestVerifyFirebaseToken:
    """TC-76 to TC-77 — Firebase token verification logic."""

    def test_decodes_valid_token_and_returns_user_dict(self):
        """TC-76: valid token → decoded user dict returned."""

        def mock_verify(token):
            assert token == "valid-token-123"
            return {"uid": "user-x", "email": "user@test.com"}

        result = verify_firebase_token_logic("valid-token-123", mock_verify)
        assert result == {"uid": "user-x", "email": "user@test.com"}

    def test_raises_401_on_invalid_token(self):
        """TC-77: invalid token → HTTPException(401)."""

        def mock_verify(token):
            raise Exception("Token expired")

        try:
            verify_firebase_token_logic("expired-token", mock_verify)
            pytest.fail("Expected HTTPException was not raised")
        except FakeHTTPException as e:
            assert e.status_code == 401
            assert e.detail == "Invalid or expired token"

    def test_raises_401_on_any_firebase_error(self):
        """TC-77 extension: any Exception from Firebase → 401."""

        def mock_verify(token):
            raise ValueError("Certificate error")

        try:
            verify_firebase_token_logic("bad-token", mock_verify)
            pytest.fail("Expected HTTPException was not raised")
        except FakeHTTPException as e:
            assert e.status_code == 401

    def test_returns_full_decoded_token(self):
        """Extension: decoded token fields beyond uid/email are preserved."""

        def mock_verify(token):
            return {
                "uid": "abc",
                "email": "a@b.com",
                "name": "Test User",
                "firebase": {"sign_in_provider": "password"},
            }

        result = verify_firebase_token_logic("token", mock_verify)
        assert result["name"] == "Test User"
