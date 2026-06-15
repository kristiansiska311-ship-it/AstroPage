"""Manual smoke check: log in to a real EduPage account and print the
homework that `edupage_service.fetch_homework` parses out of it.

This is a throwaway dev tool, not part of the test suite — it hits the live
EduPage API, so it needs real credentials. Pass them via env vars:

    EDU_USER=... EDU_PASS=... EDU_SUBDOMAIN=... uv run python scripts/check_homework.py

The password is used once for login and never stored or logged.
"""

import asyncio
import os
import sys
from pathlib import Path

# Make the backend root importable when run as `python scripts/check_homework.py`.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv

from app.services import edupage_service

load_dotenv()


async def main() -> int:
    username = os.environ.get("EDU_USER")
    password = os.environ.get("EDU_PASS")
    subdomain = os.environ.get("EDU_SUBDOMAIN")
    if not (username and password and subdomain):
        print("Set EDU_USER, EDU_PASS and EDU_SUBDOMAIN in the environment.")
        return 2

    print(f"Logging in as {username}@{subdomain}.edupage.org …")
    session_id = await edupage_service.login(username, password, subdomain)
    edupage = await edupage_service.get_client(session_id, subdomain, username)

    assignments = await edupage_service.fetch_homework(edupage)
    print(f"\nParsed {len(assignments)} homework assignment(s):\n")
    for a in assignments:
        print(f"  [{a.id}] {a.subject or '—'} · {a.title}")
        print(f"      due={a.due_date} assigned={a.assigned_at} done={a.is_done}")
        print(f"      teacher={a.teacher}")
        desc = a.description.replace("\n", " ")
        print(f"      desc={desc[:120]}{'…' if len(desc) > 120 else ''}\n")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
