import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./study_scheduler.db")

# Some hosts (Render, Heroku-style) hand out "postgres://" but SQLAlchemy 2.x
# requires the "postgresql://" scheme.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def run_migrations(engine):
    """Lightweight column migrations for deployments without Alembic."""
    import logging

    from sqlalchemy import inspect, text

    logger = logging.getLogger(__name__)
    insp = inspect(engine)
    if "users" not in insp.get_table_names():
        return

    columns = {c["name"] for c in insp.get_columns("users")}
    if "daily_start_time" not in columns:
        dialect = engine.dialect.name
        logger.info("Applying migration: add users.daily_start_time (dialect=%s)", dialect)

        try:
            with engine.begin() as conn:
                if dialect == "postgresql":
                    conn.execute(
                        text(
                            "ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_start_time "
                            "VARCHAR(5) NOT NULL DEFAULT '09:00'"
                        )
                    )
                else:
                    conn.execute(
                        text(
                            "ALTER TABLE users ADD COLUMN daily_start_time VARCHAR(5) "
                            "NOT NULL DEFAULT '09:00'"
                        )
                    )
            logger.info("Migration applied: users.daily_start_time")
        except Exception:
            logger.exception("Failed to apply users.daily_start_time migration")
            raise

    # Backfill null/empty values from a partial prior migration attempt.
    try:
        with engine.begin() as conn:
            conn.execute(
                text(
                    "UPDATE users SET daily_start_time = '09:00' "
                    "WHERE daily_start_time IS NULL OR daily_start_time = ''"
                )
            )
    except Exception:
        logger.exception("Failed to backfill users.daily_start_time")
        raise
