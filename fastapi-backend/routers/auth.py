# routers/auth.py — Firebase token verification endpoint
from fastapi import APIRouter, Depends
from firebase import verify_firebase_token

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.get("/me")
def get_me(user=Depends(verify_firebase_token)):
    """
    Dashboard calls this on load to verify the Firebase token is valid.
    Returns the decoded user info (uid, email).
    """
    return {"uid": user["uid"], "email": user.get("email")}
