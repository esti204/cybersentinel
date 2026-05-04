"""
backend/routes.py
──────────────────
All Flask API endpoints are registered here as a Blueprint
so app.py stays clean and routes can be tested in isolation.

Endpoints:
    POST /api/scan           — run a port scan
    GET  /api/history        — fetch stored scan history
    GET  /api/health         — simple liveness probe
"""

import re
import socket
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify

from port_scanner   import scan_host
from risk_analyzer  import analyze_risk
from ai_suggestions import generate_suggestions

# ── Optional Firebase ─────────────────────────────────────────────────────────
# If Firebase credentials are not configured the app still works —
# scan results are simply not persisted.
try:
    from firebase_config import init_firebase
    _db = init_firebase()
    FIREBASE_ENABLED = _db is not None
except Exception as exc:
    print(f"[Firebase] Disabled — {exc}")
    _db = None
    FIREBASE_ENABLED = False

# ── Blueprint ─────────────────────────────────────────────────────────────────
api = Blueprint("api", __name__, url_prefix="/api")


# ── Helpers ───────────────────────────────────────────────────────────────────

_IPV4_RE = re.compile(
    r"^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$"
)

# Private / loopback ranges that should never be scan targets
_BLOCKED_PREFIXES = ("127.", "0.", "169.254.", "224.", "255.")


def _is_valid_public_ip(ip: str) -> bool:
    """
    Returns True only if `ip` is a well-formed IPv4 address that is
    NOT a loopback, link-local, or reserved address.
    """
    m = _IPV4_RE.match(ip.strip())
    if not m:
        return False
    if any(int(octet) > 255 for octet in m.groups()):
        return False
    if any(ip.startswith(prefix) for prefix in _BLOCKED_PREFIXES):
        return False
    return True


def _persist_scan(ip: str, open_ports: list, risk: str) -> None:
    """
    Writes a scan record to the Firestore `scanHistory` collection.
    Silently skips if Firebase is not configured.
    """
    if not FIREBASE_ENABLED or _db is None:
        return
    try:
        _db.collection("scanHistory").add({
            "ip":         ip,
            "timestamp":  datetime.now(timezone.utc),
            "openPorts":  [p["port"] for p in open_ports],
            "risk":       risk,
        })
    except Exception as exc:
        print(f"[Firestore] Write failed: {exc}")


# ── Routes ────────────────────────────────────────────────────────────────────

@api.route("/health", methods=["GET"])
def health():
    """Quick liveness probe used by monitoring tools."""
    return jsonify({"status": "ok", "timestamp": datetime.utcnow().isoformat()})


@api.route("/scan", methods=["POST"])
def scan():
    """
    POST /api/scan
    Body (JSON): { "ip": "x.x.x.x" }

    1. Validates the IP address.
    2. Runs a concurrent TCP port scan.
    3. Calculates overall risk level.
    4. Generates AI-based security suggestions.
    5. Persists the result to Firestore (if configured).
    6. Returns the full result as JSON.
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON."}), 400

    ip = data.get("ip", "").strip()

    # ── Input validation ──────────────────────────────────────────────────────
    if not ip:
        return jsonify({"error": "IP address is required."}), 400

    if not _is_valid_public_ip(ip):
        return jsonify({
            "error": "Invalid IP address. Please enter a valid public IPv4 address."
        }), 400

    # ── DNS resolution check (optional quick pre-flight) ─────────────────────
    try:
        socket.setdefaulttimeout(3)
        socket.gethostbyname(ip)  # verifies host is reachable at network level
    except socket.gaierror:
        return jsonify({"error": f"Host {ip} could not be resolved."}), 400

    # ── Core scan logic ───────────────────────────────────────────────────────
    try:
        open_ports  = scan_host(ip)
        risk        = analyze_risk(open_ports)
        suggestions = generate_suggestions(open_ports)

        # Persist to Firestore asynchronously (best-effort)
        _persist_scan(ip, open_ports, risk)

        return jsonify({
            "ip":          ip,
            "openPorts":   open_ports,
            "risk":        risk,
            "suggestions": suggestions,
        })

    except Exception as exc:
        print(f"[SCAN ERROR] {ip}: {exc}")
        return jsonify({"error": "Scan failed due to an internal error. Please try again."}), 500


@api.route("/history", methods=["GET"])
def history():
    """
    GET /api/history
    Returns the 50 most recent scan records from Firestore.
    Returns an empty list if Firebase is not configured.
    """
    if not FIREBASE_ENABLED or _db is None:
        return jsonify({"history": [], "note": "Firebase not configured."})

    try:
        docs = (
            _db.collection("scanHistory")
               .order_by("timestamp", direction="DESCENDING")
               .limit(50)
               .stream()
        )
        records = []
        for doc in docs:
            d = doc.to_dict()
            records.append({
                "id":        doc.id,
                "ip":        d.get("ip"),
                "timestamp": d.get("timestamp").isoformat() if d.get("timestamp") else None,
                "openPorts": d.get("openPorts", []),
                "risk":      d.get("risk"),
            })
        return jsonify({"history": records})

    except Exception as exc:
        return jsonify({"error": f"Failed to fetch history: {exc}"}), 500
