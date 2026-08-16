import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent

load_dotenv(BASE_DIR / ".env")

cred_path = Path(os.getenv("FIREBASE_CREDENTIALS_PATH", "firebase-credentials.json"))
if not cred_path.is_absolute():
    cred_path = BASE_DIR / cred_path

if cred_path.exists() and not firebase_admin._apps:
    cred = credentials.Certificate(str(cred_path))
    firebase_admin.initialize_app(cred)

security = HTTPBearer()

def verify_firebase_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    """
    FastAPI dependency — verifies the Firebase ID token from the Authorization header.
    Usage: add `user=Depends(verify_firebase_token)` to any protected endpoint.
    """
    if not firebase_admin._apps:
        raise HTTPException(
            status_code=500,
            detail=f"Firebase Admin is not configured. Check FIREBASE_CREDENTIALS_PATH: {cred_path}",
        )

    token = credentials.credentials
    try:
        decoded = auth.verify_id_token(token)
        return decoded
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
