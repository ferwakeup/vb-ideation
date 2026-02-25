"""
Database configuration and session management.
"""
import os
import logging
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

logger = logging.getLogger(__name__)

# Use DATABASE_URL from environment (PostgreSQL on Render) or fallback to SQLite for local dev
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./vb_ideation.db")

# Render uses "postgres://" but SQLAlchemy needs "postgresql://"
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Configure engine based on database type
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}  # Needed for SQLite
    )
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """
    Dependency that provides a database session.
    Yields a session and ensures it's closed after use.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def run_migrations():
    """
    Run automatic database migrations to add missing columns.
    This handles schema changes without requiring manual SQL.
    """
    inspector = inspect(engine)

    # Check if users table exists
    if 'users' not in inspector.get_table_names():
        logger.info("Users table doesn't exist yet, will be created by Base.metadata.create_all()")
        return

    # Get existing columns in users table
    existing_columns = {col['name'] for col in inspector.get_columns('users')}

    # Define migrations: column_name -> (type, default)
    migrations = {
        'is_verified': ('BOOLEAN', 'FALSE'),
        'verification_token': ('VARCHAR(255)', 'NULL'),
        'verification_token_expires': ('TIMESTAMP WITH TIME ZONE', 'NULL'),
        'is_admin': ('BOOLEAN', 'FALSE'),
    }

    with engine.connect() as conn:
        for column_name, (column_type, default) in migrations.items():
            if column_name not in existing_columns:
                # Use different syntax for SQLite vs PostgreSQL
                if DATABASE_URL.startswith("sqlite"):
                    sql = f"ALTER TABLE users ADD COLUMN {column_name} {column_type} DEFAULT {default}"
                else:
                    sql = f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {column_name} {column_type} DEFAULT {default}"

                try:
                    conn.execute(text(sql))
                    conn.commit()
                    logger.info(f"Added column '{column_name}' to users table")
                except Exception as e:
                    logger.warning(f"Could not add column '{column_name}': {e}")


def init_admin_user():
    """
    Initialize the admin user (fernando@moven.pro).
    This runs on startup to ensure the admin account has admin privileges.
    """
    ADMIN_EMAIL = "fernando@moven.pro"

    with engine.connect() as conn:
        try:
            # Update the admin user if exists
            result = conn.execute(
                text("UPDATE users SET is_admin = TRUE WHERE email = :email"),
                {"email": ADMIN_EMAIL}
            )
            conn.commit()
            if result.rowcount > 0:
                logger.info(f"Set admin privileges for {ADMIN_EMAIL}")
        except Exception as e:
            logger.warning(f"Could not set admin user: {e}")
