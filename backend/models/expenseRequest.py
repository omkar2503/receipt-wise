from pydantic import BaseModel
from typing import List

class userSplit(BaseModel):
    id: int
    name: str
    paid: float
    owed: float

class ExpenseRequest(BaseModel):
    description: str
    details: str
    payer: int
    totalAmount: float
    tax: float
    userSplits: List[userSplit]
    groupId: str
    receiptPath: str