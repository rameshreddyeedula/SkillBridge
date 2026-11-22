
from sqlalchemy import inspect, text

from app.database import engine


def add_missing_columns(table_name, columns):
    inspector = inspect(engine)
    existing = {
        column["name"]
        for column in inspector.get_columns(table_name)
    }

    for column_name, column_definition in columns.items():
        if column_name not in existing:
            with engine.begin() as connection:
                connection.execute(
                    text(
                        f"ALTER TABLE {table_name} "
                        f"ADD COLUMN {column_name} {column_definition}"
                    )
                )
            print(f"Added {table_name}.{column_name}")


def main():
    add_missing_columns(
        "users",
        {
            "resume_path": "VARCHAR(500)",
            "resume_filename": "VARCHAR(255)",
        },
    )

    add_missing_columns(
        "applications",
        {
            "candidate_skills": "JSON NOT NULL DEFAULT '[]'",
            "matched_skills": "JSON NOT NULL DEFAULT '[]'",
            "missing_skills": "JSON NOT NULL DEFAULT '[]'",
            "match_percentage": "INTEGER NOT NULL DEFAULT 0",
            "resume_name": "VARCHAR(255)",
        },
    )

    print("Database migration completed.")


if __name__ == "__main__":
    main()
