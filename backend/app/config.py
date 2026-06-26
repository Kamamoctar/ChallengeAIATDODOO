from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

_ENV_FILE = Path(__file__).parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(_ENV_FILE), env_file_encoding="utf-8", extra="ignore")

    gateway_url: str = "https://odoo-gateway-kappa.vercel.app"
    gateway_api_key: str

    employee_a_id: int = 0
    employee_a_name: str = "Membre A"
    employee_a_user_id: int = 0
    employee_b_id: int = 0
    employee_b_name: str = "Membre B"
    employee_b_user_id: int = 0

    telegram_bot_token: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    telegram_user_a: int = 0
    telegram_user_b: int = 0

    allowed_origins: str = "http://localhost:5173"

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    @property
    def telegram_user_map(self) -> dict[int, int]:
        """telegram_user_id → employee_id (hr.employee)"""
        m = {}
        if self.telegram_user_a and self.employee_a_id:
            m[self.telegram_user_a] = self.employee_a_id
        if self.telegram_user_b and self.employee_b_id:
            m[self.telegram_user_b] = self.employee_b_id
        return m

    @property
    def res_user_map(self) -> dict[int, int]:
        """telegram_user_id → res.users id (for task filtering)"""
        m = {}
        if self.telegram_user_a and self.employee_a_user_id:
            m[self.telegram_user_a] = self.employee_a_user_id
        if self.telegram_user_b and self.employee_b_user_id:
            m[self.telegram_user_b] = self.employee_b_user_id
        return m

    @property
    def all_employee_ids(self) -> list[int]:
        return [i for i in [self.employee_a_id, self.employee_b_id] if i]

    def employee_name(self, employee_id: int) -> str:
        if employee_id == self.employee_a_id:
            return self.employee_a_name
        if employee_id == self.employee_b_id:
            return self.employee_b_name
        return f"Employé {employee_id}"


settings = Settings()
