"""POST /api/contact — portfolio contact form → email (INTENT FR-8, SPEC contract).

Vercel Python serverless function. Stdlib only to keep cold starts fast (ADR-002).
"""
from __future__ import annotations

import json
import os
import re
import smtplib
from email.message import EmailMessage
from http.server import BaseHTTPRequestHandler

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")
LIMITS = {"name": (2, 80), "email": (5, 120), "subject": (0, 120), "message": (10, 3000)}
DEFAULT_TO = "duggitharun909@gmail.com"
MAX_BODY = 16_384


def clean(payload: dict) -> dict[str, str]:
    """Trim every known field to a string; unknown fields are dropped."""
    return {k: str(payload.get(k) or "").strip() for k in (*LIMITS, "company")}


def validate(data: dict[str, str]) -> dict[str, str]:
    """Return {field: error}. Empty dict means valid."""
    errors: dict[str, str] = {}
    for field, (lo, hi) in LIMITS.items():
        value = data.get(field, "")
        if not lo <= len(value) <= hi:
            errors[field] = f"Must be between {lo} and {hi} characters." if lo else f"Max {hi} characters."
    if "email" not in errors and not EMAIL_RE.match(data["email"]):
        errors["email"] = "Please enter a valid email address."
    return errors


def is_spam(data: dict[str, str]) -> bool:
    """Honeypot: real users never see or fill the hidden `company` field."""
    return bool(data.get("company"))


def build_email(data: dict[str, str], sender: str, to: str) -> EmailMessage:
    msg = EmailMessage()
    msg["Subject"] = f"[Portfolio] {data['subject'] or 'New message'} — {data['name']}"
    msg["From"] = f"Portfolio Contact <{sender}>"
    msg["To"] = to
    msg["Reply-To"] = data["email"]
    msg.set_content(
        f"Name:    {data['name']}\n"
        f"Email:   {data['email']}\n"
        f"Subject: {data['subject'] or '-'}\n\n"
        f"{data['message']}\n"
    )
    return msg


def send(msg: EmailMessage, user: str, password: str) -> None:
    with smtplib.SMTP(os.environ.get("SMTP_HOST", "smtp.gmail.com"), int(os.environ.get("SMTP_PORT", "587")), timeout=10) as s:
        s.starttls()
        s.login(user, password)
        s.send_message(msg)


def handle(payload: dict) -> tuple[int, dict]:
    """Pure request logic → (status, body). Kept separate from HTTP plumbing for tests."""
    data = clean(payload)
    if is_spam(data):
        return 200, {"ok": True}
    errors = validate(data)
    if errors:
        return 400, {"ok": False, "errors": errors}

    user, password = os.environ.get("SMTP_USER"), os.environ.get("SMTP_PASS")
    if not (user and password):
        return 503, {"ok": False, "fallback": True, "error": "Email service not configured."}
    try:
        send(build_email(data, user, os.environ.get("CONTACT_TO", DEFAULT_TO)), user, password)
    except (smtplib.SMTPException, OSError):
        return 502, {"ok": False, "fallback": True, "error": "Could not send right now."}
    return 200, {"ok": True}


class handler(BaseHTTPRequestHandler):  # noqa: N801 — name required by Vercel
    def _reply(self, status: int, body: dict) -> None:
        raw = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(raw)

    def do_POST(self) -> None:  # noqa: N802
        length = int(self.headers.get("Content-Length") or 0)
        if length > MAX_BODY:
            return self._reply(413, {"ok": False, "error": "Payload too large."})
        try:
            payload = json.loads(self.rfile.read(length) or b"{}")
            if not isinstance(payload, dict):
                raise ValueError
        except ValueError:
            return self._reply(400, {"ok": False, "error": "Invalid JSON."})
        self._reply(*handle(payload))

    def do_GET(self) -> None:  # noqa: N802
        self._reply(405, {"ok": False, "error": "Use POST."})
