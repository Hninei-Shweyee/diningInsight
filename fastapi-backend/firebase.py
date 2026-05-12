# firebase.py — Firebase Admin SDK setup for token verification
import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
import os

load_dotenv()

# Initialize Firebase app once at startup
cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "firebase-credentials.json")
if os.path.exists(cred_path) and not firebase_admin._apps:
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)

security = HTTPBearer()

def verify_firebase_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    """
    FastAPI dependency — verifies the Firebase ID token from the Authorization header.
    Usage: add `user=Depends(verify_firebase_token)` to any protected endpoint.
    """
    token = credentials.credentials
    try:
        decoded = auth.verify_id_token(token)
        return decoded
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
