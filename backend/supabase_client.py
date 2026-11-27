import json
from datetime import datetime, timezone
from typing import Any
import httpx


DEFAULT_SUPPORT_CONTACTS: dict[str, Any] = {
    "bio": {"telegram": "@rashidov_bio_mentor", "phone": "+998 90 123 45 67"},
    "chem": {"telegram": "@rashidov_chem_mentor", "phone": "+998 90 765 43 21"},
    "tech": {"telegram": "@rashidov_support", "phone": "+998 95 889 78 88"},
}


class SupabaseRest:
    def __init__(self, url: str, key: str, client: httpx.AsyncClient) -> None:
        self.base_url = url.rstrip("/") + "/rest/v1"
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }
        self.client = client

    async def get_user(self, telegram_id: int) -> dict[str, Any] | None:
        resp = await self.client.get(
            f"{self.base_url}/users",
            headers=self.headers,
            params={"telegram_id": f"eq.{telegram_id}", "select": "*", "limit": "1"},
        )
        resp.raise_for_status()
        rows = resp.json()
        return rows[0] if rows else None

    async def find_users_by_query(self, query_text: str) -> list[dict[str, Any]]:
        q = (query_text or "").strip().lstrip("@")
        if not q:
            return []
        if q.isdigit():
            exact = await self.get_user(int(q))
            return [exact] if exact else []
        clean = q.replace("*", "").replace("(", "").replace(")", "").replace(",", "")
        resp = await self.client.get(
            f"{self.base_url}/users",
            headers=self.headers,
            params={
                "full_name": f"ilike.*{clean}*",
                "select": "*",
                "order": "created_at.desc",
                "limit": "10",
            },
        )
        resp.raise_for_status()
        return resp.json()

    async def create_user(
        self,
        telegram_id: int,
        full_name: str,
        referred_by: int | None = None,
        language: str = "uz",
    ) -> dict[str, Any]:
        resp = await self.client.post(
            f"{self.base_url}/users",
            headers={**self.headers, "Prefer": "return=representation"},
            json={
                "telegram_id": telegram_id,
                "role": "student",
                "full_name": full_name,
                "language": language,
                "balance": 0,
                "referred_by": referred_by,
            },
        )
        resp.raise_for_status()
        return resp.json()[0]

    async def update_language(self, telegram_id: int, language: str) -> None:
        resp = await self.client.patch(
            f"{self.base_url}/users",
            headers=self.headers,
            params={"telegram_id": f"eq.{telegram_id}"},
            json={"language": language},
        )
        resp.raise_for_status()

    async def increment_balance(self, telegram_id: int, delta: int) -> int:
        resp = await self.client.post(
            f"{self.base_url}/rpc/increment_balance",
            headers=self.headers,
            json={"p_user_id": telegram_id, "p_delta": delta},
        )
        resp.raise_for_status()
        return int(resp.json())

    async def log_transaction(
        self,
        user_id: int,
        amount: int,
        tx_type: str,
        description: str,
    ) -> None:
        resp = await self.client.post(
            f"{self.base_url}/transactions",
            headers=self.headers,
            json={
                "user_id": user_id,
                "amount": amount,
                "type": tx_type,
                "description": description,
            },
        )
        resp.raise_for_status()

    async def get_support_contacts(self) -> dict[str, Any]:
        try:
            resp = await self.client.get(
                f"{self.base_url}/subjects",
                headers=self.headers,
                params={"id": "eq.1", "select": "id,description", "limit": "1"},
            )
            resp.raise_for_status()
            rows = resp.json()
            if rows and isinstance(rows[0].get("description"), str):
                parsed = json.loads(rows[0]["description"])
                if isinstance(parsed, dict):
                    return {
                        "bio": {**DEFAULT_SUPPORT_CONTACTS["bio"], **(parsed.get("bio") or {})},
                        "chem": {**DEFAULT_SUPPORT_CONTACTS["chem"], **(parsed.get("chem") or {})},
                        "tech": {**DEFAULT_SUPPORT_CONTACTS["tech"], **(parsed.get("tech") or {})},
                    }
        except Exception:
            pass
        return DEFAULT_SUPPORT_CONTACTS

    async def get_lesson(self, lesson_id: int) -> dict[str, Any] | None:
        resp = await self.client.get(
            f"{self.base_url}/lessons",
            headers=self.headers,
            params={"id": f"eq.{lesson_id}", "select": "id,title,video_url", "limit": "1"},
        )
        resp.raise_for_status()
        rows = resp.json()
        return rows[0] if rows else None

    async def get_admin_assignments(self, user_id: int) -> list[dict[str, Any]]:
        resp = await self.client.get(
            f"{self.base_url}/subject_admins",
            headers=self.headers,
            params={"user_id": f"eq.{user_id}", "select": "*"},
        )
        resp.raise_for_status()
        return resp.json()

    async def get_subjects_by_ids(self, subject_ids: list[int]) -> list[dict[str, Any]]:
        if not subject_ids:
            return []
        ids_csv = ",".join(str(i) for i in subject_ids)
        resp = await self.client.get(
            f"{self.base_url}/subjects",
            headers=self.headers,
            params={"id": f"in.({ids_csv})", "select": "*"},
        )
        resp.raise_for_status()
        return resp.json()

    async def get_student_ids_for_broadcast(
        self,
        subject_ids: list[int] | None,
    ) -> list[int]:
        if subject_ids is None:
            resp = await self.client.get(
                f"{self.base_url}/users",
                headers=self.headers,
                params={"role": "eq.student", "select": "telegram_id"},
            )
            resp.raise_for_status()
            return [int(row["telegram_id"]) for row in resp.json()]

        if not subject_ids:
            return []

        subj_csv = ",".join(str(i) for i in subject_ids)
        courses_resp = await self.client.get(
            f"{self.base_url}/courses",
            headers=self.headers,
            params={"subject_id": f"in.({subj_csv})", "select": "id"},
        )
        courses_resp.raise_for_status()
        course_ids = [row["id"] for row in courses_resp.json()]
        if not course_ids:
            return []

        course_csv = ",".join(str(i) for i in course_ids)
        lessons_resp = await self.client.get(
            f"{self.base_url}/lessons",
            headers=self.headers,
            params={"course_id": f"in.({course_csv})", "select": "id"},
        )
        lessons_resp.raise_for_status()
        lesson_ids = [row["id"] for row in lessons_resp.json()]
        if not lesson_ids:
            return []

        lesson_csv = ",".join(str(i) for i in lesson_ids)
        progress_resp = await self.client.get(
            f"{self.base_url}/progress",
            headers=self.headers,
            params={"lesson_id": f"in.({lesson_csv})", "select": "user_id"},
        )
        progress_resp.raise_for_status()
        unique_ids = sorted({int(row["user_id"]) for row in progress_resp.json()})
        if not unique_ids:
            return []

        users_csv = ",".join(str(i) for i in unique_ids)
        users_resp = await self.client.get(
            f"{self.base_url}/users",
            headers=self.headers,
            params={
                "telegram_id": f"in.({users_csv})",
                "role": "eq.student",
                "select": "telegram_id",
            },
        )
        users_resp.raise_for_status()
        return [int(row["telegram_id"]) for row in users_resp.json()]

    async def get_bot_state(self, user_id: int) -> dict[str, Any] | None:
        resp = await self.client.get(
            f"{self.base_url}/bot_states",
            headers=self.headers,
            params={"user_id": f"eq.{user_id}", "select": "*", "limit": "1"},
        )
        resp.raise_for_status()
        rows = resp.json()
        return rows[0] if rows else None

    async def set_bot_state(
        self,
        user_id: int,
        state: str | None,
        data: dict[str, Any],
    ) -> None:
        resp = await self.client.post(
            f"{self.base_url}/bot_states",
            headers={**self.headers, "Prefer": "resolution=merge-duplicates"},
            json={
                "user_id": user_id,
                "state": state,
                "data": data,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
        )
        resp.raise_for_status()

    async def clear_bot_state(self, user_id: int) -> None:
        resp = await self.client.delete(
            f"{self.base_url}/bot_states",
            headers=self.headers,
            params={"user_id": f"eq.{user_id}"},
        )
        resp.raise_for_status()
