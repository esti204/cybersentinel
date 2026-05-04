"""
backend/firebase_config.py
──────────────────────────
Initializes the Firebase Admin SDK once for the entire app.
Import `db` wherever you need Firestore access.
"""

import os
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

# ── Singleton guard ──────────────────────────────────────────────────────────
# firebase_admin.initialize_app() must be called exactly once per process.
_app = None
db   = None


def init_firebase():
    """
    Builds a credential object from environment variables and initialises
    the Firebase Admin SDK.  Returns the Firestore client.

    Call this once at application startup (app.py does this).
    """
    global _app, db

    if _app is not None:
        return db  # Already initialised — return existing client

    # Build credential dict from individual env vars (no JSON file needed)
    cred_dict = {
        "type": "service_account",
        "project_id":    os.getenv("FIREBASE_PROJECT_ID"),
        "client_email":  os.getenv("FIREBASE_CLIENT_EMAIL"),
        # .env stores \n as literal two chars — convert to real newline
        "private_key":   os.getenv("FIREBASE_PRIVATE_KEY", "").replace("\\n", "\n"),
        "token_uri":     "https://oauth2.googleapis.com/token",
    }

    cred = credentials.Certificate(cred_dict)
    _app = firebase_admin.initialize_app(cred)
    db   = firestore.client()

    print("[Firebase] Admin SDK initialised successfully")
    return db
