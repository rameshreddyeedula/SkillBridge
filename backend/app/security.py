
import os
from datetime import datetime, timedelta, timezone

from jose import jwt, JWTError
from passlib.context import CryptContext


# --------------------------------------------------
# JWT CONFIGURATION
# --------------------------------------------------

SECRET_KEY = os.getenv("JWT_SECRET")

if not SECRET_KEY:
    SECRET_KEY = "dev-only-change-this-secret-before-deployment"

    if os.getenv("ENVIRONMENT", "development").lower() == "production":
        raise RuntimeError(
            "JWT_SECRET must be configured in production"
        )

ALGORITHM = "HS256"
EXPIRE_MINUTES = int(
    os.getenv("JWT_EXPIRE_MINUTES", "1440")
)


# --------------------------------------------------
# PASSWORD HASHING
# --------------------------------------------------

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)


def hash_password(password: str) -> str:
    if not password:
        raise ValueError("Password cannot be empty.")

    if len(password.encode("utf-8")) > 72:
        raise ValueError(
            "Password must not exceed 72 UTF-8 bytes."
        )

    return pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    if not password or not hashed:
        return False

    if len(password.encode("utf-8")) > 72:
        return False

    try:
        return pwd_context.verify(password, hashed)

    except (ValueError, TypeError):
        return False


# --------------------------------------------------
# JWT TOKEN CREATION
# --------------------------------------------------

def create_access_token(user_id: int) -> str:
    expires = datetime.now(timezone.utc) + timedelta(
        minutes=EXPIRE_MINUTES
    )

    payload = {
        "sub": str(user_id),
        "exp": expires,
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


# --------------------------------------------------
# JWT TOKEN VALIDATION
# --------------------------------------------------

def decode_token(token: str) -> int | None:
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        subject = payload.get("sub")

        if subject is None:
            return None

        return int(subject)

    except (JWTError, TypeError, ValueError):
        return None
