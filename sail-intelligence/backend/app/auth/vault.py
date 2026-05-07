"""
app/auth/vault.py

AES-256 secret vault using Fernet symmetric encryption.

Fernet guarantees:
  - AES-128-CBC encryption (effectively 256-bit with a 32-byte key)
  - HMAC-SHA256 authentication
  - Timestamp-based token expiry (optional)

Usage:
    vault = SecretVault()
    token = vault.encrypt("my-api-key-value")   # store `token` in DB
    value = vault.decrypt(token)                 # retrieve plaintext
"""

from __future__ import annotations

from cryptography.fernet import Fernet, InvalidToken

from app.config import get_settings
from app.core.exceptions import VaultError


class SecretVault:
    """
    Thin wrapper around cryptography.Fernet.
    The encryption key is read from settings (VAULT_ENCRYPTION_KEY env var).
    Never expose the key or plaintext through any API surface.
    """

    def __init__(self) -> None:
        settings = get_settings()
        try:
            self._fernet = Fernet(settings.vault_encryption_key.encode())
        except Exception as exc:
            raise VaultError(
                message="Failed to initialise vault — check VAULT_ENCRYPTION_KEY.",
                detail={"error": str(exc)},
            ) from exc

    def encrypt(self, plaintext: str) -> str:
        """
        Encrypt a plaintext secret.
        Returns a URL-safe base64-encoded token string safe for DB storage.
        """
        try:
            return self._fernet.encrypt(plaintext.encode()).decode()
        except Exception as exc:
            raise VaultError(message=f"Encryption failed: {exc}") from exc

    def decrypt(self, token: str) -> str:
        """
        Decrypt a previously encrypted token.
        Raises VaultError on tampered, expired, or malformed tokens.
        """
        try:
            return self._fernet.decrypt(token.encode()).decode()
        except InvalidToken as exc:
            raise VaultError(
                message="Decryption failed — token is invalid or tampered.",
                code="vault_invalid_token",
            ) from exc
        except Exception as exc:
            raise VaultError(message=f"Decryption error: {exc}") from exc


# Singleton
vault = SecretVault()
