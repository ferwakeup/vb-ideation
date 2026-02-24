"""
Email service for sending verification and notification emails.
"""
import smtplib
import secrets
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Optional
import logging
import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)


def generate_verification_token() -> str:
    """Generate a secure random verification token."""
    return secrets.token_urlsafe(32)


def get_token_expiry() -> datetime:
    """Get expiry time for verification token (24 hours from now)."""
    return datetime.utcnow() + timedelta(hours=24)


async def send_verification_email(
    to_email: str,
    full_name: str,
    verification_token: str
) -> bool:
    """
    Send verification email to user.
    Supports both SMTP and Resend API.
    Returns True if sent successfully, False otherwise.
    """
    settings = get_settings()

    # Build verification URL
    frontend_url = settings.frontend_url.rstrip('/')
    verification_url = f"{frontend_url}/verify-email?token={verification_token}"

    subject = "Verify your VB Ideation account"

    # HTML email content
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #1f2937; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #2563eb; padding: 24px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">VB Ideation</h1>
            </div>
            <div style="padding: 32px; color: #e5e7eb;">
                <h2 style="color: white; margin-top: 0;">Welcome, {full_name}!</h2>
                <p style="font-size: 16px; line-height: 1.6;">
                    Thanks for signing up for VB Ideation. Please verify your email address by clicking the button below:
                </p>
                <div style="text-align: center; margin: 32px 0;">
                    <a href="{verification_url}"
                       style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                        Verify Email Address
                    </a>
                </div>
                <p style="font-size: 14px; color: #9ca3af;">
                    This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
                </p>
                <hr style="border: none; border-top: 1px solid #374151; margin: 24px 0;">
                <p style="font-size: 12px; color: #6b7280; text-align: center;">
                    If the button doesn't work, copy and paste this link into your browser:<br>
                    <a href="{verification_url}" style="color: #60a5fa; word-break: break-all;">{verification_url}</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    """

    # Plain text fallback
    text_content = f"""
    Welcome to VB Ideation, {full_name}!

    Please verify your email address by visiting:
    {verification_url}

    This link will expire in 24 hours.

    If you didn't create an account, you can safely ignore this email.
    """

    # Try Resend API first if configured
    if settings.resend_api_key:
        return await _send_via_resend(
            to_email, subject, html_content, text_content, settings
        )

    # Fall back to SMTP
    if settings.smtp_host and settings.smtp_username:
        return await _send_via_smtp(
            to_email, subject, html_content, text_content, settings
        )

    logger.warning("No email service configured. Verification email not sent.")
    logger.info(f"Verification URL for {to_email}: {verification_url}")
    return False


async def _send_via_resend(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: str,
    settings
) -> bool:
    """Send email using Resend API."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings.resend_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": settings.email_from,
                    "to": [to_email],
                    "subject": subject,
                    "html": html_content,
                    "text": text_content
                }
            )
            if response.status_code == 200:
                logger.info(f"Verification email sent to {to_email} via Resend")
                return True
            else:
                logger.error(f"Resend API error: {response.text}")
                return False
    except Exception as e:
        logger.error(f"Failed to send email via Resend: {e}")
        return False


async def _send_via_smtp(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: str,
    settings
) -> bool:
    """Send email using SMTP."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.email_from
        msg["To"] = to_email

        msg.attach(MIMEText(text_content, "plain"))
        msg.attach(MIMEText(html_content, "html"))

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            if settings.smtp_tls:
                server.starttls()
            if settings.smtp_username and settings.smtp_password:
                server.login(settings.smtp_username, settings.smtp_password)
            server.sendmail(settings.email_from, to_email, msg.as_string())

        logger.info(f"Verification email sent to {to_email} via SMTP")
        return True
    except Exception as e:
        logger.error(f"Failed to send email via SMTP: {e}")
        return False
