from pydantic import BaseModel


class CategoryWallet(BaseModel):
    category: str
    advanced: int  # da ung (tach quy tra vendor)
    used: int      # da dung (cong don qua cac buoi)
    remaining: int  # con lai = advanced - used


class CostByCategoryReport(BaseModel):
    categories: list[CategoryWallet]
    total_advanced: int
    total_used: int
    total_remaining: int
