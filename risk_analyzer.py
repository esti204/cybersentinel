"""
backend/risk_analyzer.py
─────────────────────────
Determines an overall risk level from a list of open ports.
Uses a simple priority set approach — fast and easy to extend.
"""

from typing import List, Dict

# ── Risk classifications ──────────────────────────────────────────────────────

# Ports that are dangerous when publicly exposed (plaintext, common exploits)
HIGH_RISK_PORTS = {21, 23, 445, 3389, 6379, 9200, 27017}

# Ports that need hardening but are not inherently dangerous if configured well
MEDIUM_RISK_PORTS = {22, 25, 110, 143, 3306, 5432, 8080}


def analyze_risk(open_ports: List[Dict]) -> str:
    """
    Scores the overall risk of a scan result.

    Priority:
        Any HIGH risk port found   → "High"
        Any MEDIUM risk port found → "Medium"
        Only low-risk ports / none → "Low"

    Args:
        open_ports: list of { "port": int, "service": str }

    Returns:
        "High" | "Medium" | "Low"
    """
    port_numbers = {p["port"] for p in open_ports}

    if port_numbers & HIGH_RISK_PORTS:
        return "High"
    if port_numbers & MEDIUM_RISK_PORTS:
        return "Medium"
    return "Low"
