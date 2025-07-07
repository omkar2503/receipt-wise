from pydantic import BaseModel, Field
from typing import List, Optional


class ReceiptItem(BaseModel):
    """Represents a single item on a receipt with name and cost"""
    name: str = Field(description="Name of the purchased item")
    cost: float = Field(description="Cost of the item in dollars")


class ReceiptData(BaseModel):
    """Represents a full receipt with items and tax information"""
    items: List[ReceiptItem] = Field(description="List of items purchased")
    tax: float = Field(description="Tax amount in dollars")
    total: Optional[float] = Field(None, description="Total amount including tax")
    