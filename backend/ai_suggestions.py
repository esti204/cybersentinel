"""
backend/ai_suggestions.py
──────────────────────────
Rule-based AI suggestion engine.

Each port has one rule that produces a severity level and a
plain-English security recommendation for the analyst.
Rules are sorted High → Medium → Low before being returned.
"""

from typing import List, Dict

# ── Rule table ────────────────────────────────────────────────────────────────
# key   : port number (int)
# value : { "level": str, "message": str }

RULES: Dict[int, Dict] = {
    21: {
        "level":   "High",
        "message": "Port 21 (FTP) is exposed. FTP transmits credentials in cleartext. "
                   "Disable FTP immediately and migrate to SFTP (port 22) or FTPS.",
    },
    22: {
        "level":   "Medium",
        "message": "Port 22 (SSH) is open. Disable PasswordAuthentication in sshd_config, "
                   "enforce SSH key-based auth only, and install fail2ban.",
    },
    23: {
        "level":   "High",
        "message": "Port 23 (Telnet) is open — critical risk. Telnet sends all data in "
                   "cleartext. Shut it down and replace with SSH immediately.",
    },
    25: {
        "level":   "Medium",
        "message": "Port 25 (SMTP) detected. Restrict open relay to authenticated users. "
                   "Configure SPF, DKIM, and DMARC DNS records.",
    },
    53: {
        "level":   "Low",
        "message": "Port 53 (DNS) is open. If not a DNS server, disable it. "
                   "Enable DNSSEC and restrict recursive queries to trusted IPs.",
    },
    80: {
        "level":   "Low",
        "message": "Port 80 (HTTP) is open. Implement a 301 permanent redirect to HTTPS "
                   "for all traffic and add HSTS headers.",
    },
    110: {
        "level":   "Medium",
        "message": "Port 110 (POP3) is exposed. POP3 sends credentials in cleartext. "
                   "Migrate to POP3S (port 995) with enforced TLS.",
    },
    143: {
        "level":   "Medium",
        "message": "Port 143 (IMAP) is open. Switch to IMAPS (port 993) and enforce TLS. "
                   "Disable plaintext IMAP in your mail server config.",
    },
    443: {
        "level":   "Low",
        "message": "Port 443 (HTTPS) is active. Verify TLS 1.3 is enforced, disable weak "
                   "cipher suites, and ensure your SSL certificate is not expired.",
    },
    445: {
        "level":   "High",
        "message": "Port 445 (SMB) is publicly exposed — critical. SMB is the EternalBlue / "
                   "WannaCry attack vector. Block port 445 at your firewall immediately.",
    },
    3306: {
        "level":   "High",
        "message": "Port 3306 (MySQL) is accessible externally. Set bind-address=127.0.0.1 "
                   "in my.cnf and use SSH tunnelling for remote access.",
    },
    3389: {
        "level":   "High",
        "message": "Port 3389 (RDP) is exposed — a top brute-force target. Enable Network "
                   "Level Authentication, restrict by IP allowlist, and route through VPN.",
    },
    5432: {
        "level":   "High",
        "message": "Port 5432 (PostgreSQL) is externally reachable. Update pg_hba.conf to "
                   "restrict connections to 127.0.0.1 and trusted IPs only.",
    },
    6379: {
        "level":   "High",
        "message": "Port 6379 (Redis) open without auth — enables remote code execution. "
                   "Set requirepass in redis.conf and bind Redis to localhost.",
    },
    8080: {
        "level":   "Medium",
        "message": "Port 8080 (HTTP-Alt) is accessible. If this is a dev/staging server, "
                   "ensure it is not publicly routed or add authentication.",
    },
    8443: {
        "level":   "Low",
        "message": "Port 8443 (HTTPS-Alt) is open. Verify this service is intentional and "
                   "its TLS config matches your production security standards.",
    },
    9200: {
        "level":   "High",
        "message": "Port 9200 (Elasticsearch) is open — unauthenticated access exposes all "
                   "indexed data. Enable X-Pack security and restrict network access.",
    },
    27017: {
        "level":   "High",
        "message": "Port 27017 (MongoDB) is publicly exposed. Unauthenticated MongoDB is a "
                   "critical misconfiguration. Enable auth and bind to 127.0.0.1.",
    },
}

_ORDER = {"High": 0, "Medium": 1, "Low": 2}


def generate_suggestions(open_ports: List[Dict]) -> List[Dict]:
    """
    Produces a prioritised list of security recommendations.

    Only ports that have a defined rule are included.
    Results are sorted High → Medium → Low.

    Args:
        open_ports: list of { "port": int, "service": str }

    Returns:
        list of { "port", "service", "level", "message" }
    """
    suggestions = []

    for p in open_ports:
        rule = RULES.get(p["port"])
        if rule:
            suggestions.append({
                "port":    p["port"],
                "service": p["service"],
                "level":   rule["level"],
                "message": rule["message"],
            })

    suggestions.sort(key=lambda s: _ORDER[s["level"]])
    return suggestions
