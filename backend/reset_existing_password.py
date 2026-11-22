
from getpass import getpass

from sqlalchemy.orm import Session

from app.database import engine
from app.models import User
from app.security import hash_password


def main():
    email = input("Enter your registered email: ").strip().lower()
    password = getpass("Enter your new password (at least 8 characters): ")
    confirm = getpass("Confirm your new password: ")

    if len(password) < 8:
        print("Error: Password must contain at least 8 characters.")
        return

    if len(password.encode("utf-8")) > 72:
        print("Error: Password must not exceed 72 UTF-8 bytes.")
        return

    if password != confirm:
        print("Error: Passwords do not match.")
        return

    with Session(engine) as db:
        user = db.query(User).filter(User.email == email).first()

        if user is None:
            print("Error: Account not found. No changes were made.")
            return

        user.password_hash = hash_password(password)
        db.commit()

        print("Password reset successfully for:", user.email)
        print("You can now log in with your new password.")


if __name__ == "__main__":
    main()
