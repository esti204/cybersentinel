"""
backend/port_scanner.py
────────────────────────
TCP-socket-based port scanner.
Probes every port in COMMON_PORTS concurrently using threads,
then returns a list of the ones that accepted a connection.
"""

import socket
import concurrent.futures
from typing import List, Dict

# ── Port catalogue ────────────────────────────────────────────────────────────
# Each tuple: (port_number, service_name)
COMMON_PORTS: List[tuple] = [
    (21,    "FTP"),
    (22,    "SSH"),
    (23,    "Telnet"),
    (25,    "SMTP"),
    (53,    "DNS"),
    (80,    "HTTP"),
    (110,   "POP3"),
    (143,   "IMAP"),
    (443,   "HTTPS"),
    (445,   "SMB"),
    (3306,  "MySQL"),
    (3389,  "RDP"),
    (5432,  "PostgreSQL"),
    (6379,  "Redis"),
    (8080,  "HTTP-Alt"),
    (8443,  "HTTPS-Alt"),
    (9200,  "Elasticsearch"),
    (27017, "MongoDB"),
]

# How long (seconds) to wait before declaring a port closed/filtered
TIMEOUT_SECONDS = 1.5


def _probe_port(host: str, port: int, service: str) -> Dict | None:
    """
    Attempts a single TCP connection to host:port.

    Returns a dict  { port, service }  if the port is open,
    or None if it is closed / filtered / timed-out.
    """
    try:
        with socket.create_connection((host, port), timeout=TIMEOUT_SECONDS):
            return {"port": port, "service": service}
    except (ConnectionRefusedError, socket.timeout, OSError):
        return None


def scan_host(host: str) -> List[Dict]:
    """
    Scans all COMMON_PORTS on the target host concurrently.

    Uses a ThreadPoolExecutor so all probes fire in parallel —
    the total scan time is roughly equal to TIMEOUT_SECONDS rather
    than TIMEOUT_SECONDS × len(COMMON_PORTS).

    Args:
        host: IPv4 address string, e.g. "192.168.1.1"

    Returns:
        List of dicts for ports that are open, e.g.:
        [ {"port": 80, "service": "HTTP"}, ... ]
    """
    open_ports = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
        futures = {
            executor.submit(_probe_port, host, port, service): (port, service)
            for port, service in COMMON_PORTS
        }

        for future in concurrent.futures.as_completed(futures):
            result = future.result()
            if result is not None:
                open_ports.append(result)

    # Sort ascending by port number for consistent output
    return sorted(open_ports, key=lambda x: x["port"])
