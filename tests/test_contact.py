"""Tests for api/contact.py (INTENT acceptance: `pytest` passes for the contact API)."""
import smtplib
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "api"))
import contact  # noqa: E402

VALID = {"name": "Ada Lovelace", "email": "ada@example.com", "subject": "Role", "message": "Hello Tharun, let's talk!"}


@pytest.fixture(autouse=True)
def no_smtp_env(monkeypatch):
    for key in ("SMTP_USER", "SMTP_PASS", "CONTACT_TO"):
        monkeypatch.delenv(key, raising=False)


def test_valid_payload_has_no_errors():
    assert contact.validate(contact.clean(VALID)) == {}


@pytest.mark.parametrize("field,value", [
    ("name", "A"), ("email", "not-an-email"), ("message", "short"), ("subject", "x" * 121),
])
def test_invalid_fields_are_reported(field, value):
    status, body = contact.handle({**VALID, field: value})
    assert status == 400 and field in body["errors"]


def test_honeypot_is_silently_accepted():
    assert contact.handle({**VALID, "company": "bot inc"}) == (200, {"ok": True})


def test_unconfigured_smtp_requests_fallback():
    status, body = contact.handle(VALID)
    assert status == 503 and body["fallback"] is True


def test_sends_email_when_configured(monkeypatch):
    sent = {}
    monkeypatch.setenv("SMTP_USER", "me@gmail.com")
    monkeypatch.setenv("SMTP_PASS", "app-pass")
    monkeypatch.setattr(contact, "send", lambda msg, u, p: sent.update(msg=msg))
    assert contact.handle(VALID) == (200, {"ok": True})
    assert sent["msg"]["To"] == "duggitharun909@gmail.com"
    assert sent["msg"]["Reply-To"] == "ada@example.com"


def test_smtp_failure_returns_502(monkeypatch):
    monkeypatch.setenv("SMTP_USER", "me@gmail.com")
    monkeypatch.setenv("SMTP_PASS", "app-pass")

    def boom(*_):
        raise smtplib.SMTPAuthenticationError(535, b"bad creds")

    monkeypatch.setattr(contact, "send", boom)
    assert contact.handle(VALID)[0] == 502
