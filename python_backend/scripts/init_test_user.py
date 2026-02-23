import asyncio
import os
import uuid

import asyncpg
from passlib.context import CryptContext

EMAIL = "thelia@example.com"
USERNAME = "thelia"
PASSWORD = "123456"


async def main() -> None:
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    conn = await asyncpg.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "5433")),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "password"),
        database=os.getenv("DB_NAME", "ai_language_learning"),
    )

    try:
        existing = await conn.fetchval("SELECT id FROM users WHERE email = $1", EMAIL)
        if existing:
            print(f"测试用户已存在: {EMAIL}")
            print(f"测试账号: {EMAIL}")
            print(f"测试密码: {PASSWORD}")
            return

        password_hash = pwd_context.hash(PASSWORD)
        user_id = str(uuid.uuid4())
        await conn.execute(
            """
            INSERT INTO users (id, username, email, password_hash, role)
            VALUES ($1, $2, $3, $4, 'user')
            """,
            user_id,
            USERNAME,
            EMAIL,
            password_hash,
        )

        await conn.execute(
            "INSERT INTO user_preferences (id, user_id) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING",
            str(uuid.uuid4()),
            user_id,
        )

        credit_column = await conn.fetchval(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'user_credits'
              AND column_name IN ('current_balance', 'balance')
            LIMIT 1
            """
        )

        if credit_column == "current_balance":
            await conn.execute(
                """
                INSERT INTO user_credits (id, user_id, current_balance, total_earned, total_spent)
                VALUES ($1, $2, 100, 100, 0)
                ON CONFLICT (user_id) DO NOTHING
                """,
                str(uuid.uuid4()),
                user_id,
            )
        elif credit_column == "balance":
            await conn.execute(
                """
                INSERT INTO user_credits (id, user_id, balance, total_earned, total_spent)
                VALUES ($1, $2, 100, 100, 0)
                ON CONFLICT (user_id) DO NOTHING
                """,
                str(uuid.uuid4()),
                user_id,
            )

        print(f"测试用户已创建: {EMAIL}")
        print(f"测试账号: {EMAIL}")
        print(f"测试密码: {PASSWORD}")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
