"""
backend/app.py
───────────────
Application entry point.

Run locally:
    python app.py

Or with Flask CLI:
    flask run --port 5000
"""

import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

# Load .env file before anything else
load_dotenv()

from routes import api  # Import the Blueprint


def create_app() -> Flask:
    """
    Application factory.
    Creates and configures the Flask app, registers extensions
    and blueprints, then returns the ready-to-run instance.
    """
    app = Flask(__name__)

    # ── CORS ──────────────────────────────────────────────────────────────────
    # Allow requests from the frontend dev server and local file:// origin.
    allowed_origin = os.getenv("ALLOWED_ORIGIN", "*")
    CORS(app, resources={r"/api/*": {"origins": [allowed_origin, "null"]}})

    # ── Register Blueprints ───────────────────────────────────────────────────
    app.register_blueprint(api)

    # ── Root health check ─────────────────────────────────────────────────────
    @app.route("/")
    def index():
        return {"message": "CyberSentinel API is running", "version": "1.0.0"}

    # ── Global error handlers ─────────────────────────────────────────────────
    @app.errorhandler(404)
    def not_found(e):
        return {"error": "Endpoint not found"}, 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return {"error": "Method not allowed"}, 405

    @app.errorhandler(500)
    def internal_error(e):
        return {"error": "Internal server error"}, 500

    return app


# ── Run ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app  = create_app()

    print(f"""
╔══════════════════════════════════════════╗
║   CyberSentinel Backend                  ║
║   Running on http://127.0.0.1:{port}        ║
╚══════════════════════════════════════════╝
    """)

    app.run(host="0.0.0.0", port=port, debug=bool(os.getenv("FLASK_DEBUG", True)))
