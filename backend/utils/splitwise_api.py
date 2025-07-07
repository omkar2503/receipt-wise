from dotenv import load_dotenv
load_dotenv()

import os
import requests

class SplitwiseAPI:
    BASE_URL = "https://secure.splitwise.com/api/v3.0"

    def __init__(self):
        self.api_key = os.getenv("SPLITWISE_API_KEY")
        if not self.api_key:
            raise ValueError("SPLITWISE_API_KEY not set in environment variables")
        self.headers = {"Authorization": f"Bearer {self.api_key}"}

    def get_groups(self):
        url = f"{self.BASE_URL}/get_groups"
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        return response.json().get("groups", [])

    def get_group_members(self, group_id):
        url = f"{self.BASE_URL}/get_group/{group_id}"
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        group = response.json().get("group", {})
        return group.get("members", [])

    def get_expenses(self, group_id):
        url = f"{self.BASE_URL}/get_expenses?group_id={group_id}"
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        return response.json().get("expenses", [])

    def create_expense(self, group_id, description, cost, users, currency_code="INR", details=None):
        """
        Create an expense in a Splitwise group.
        users: list of dicts, each with keys: user_id, paid_share, owed_share
        """
        url = f"{self.BASE_URL}/create_expense"
        data = {
            "group_id": group_id,
            "description": description,
            "cost": str(cost),
            "currency_code": currency_code,
        }
        if details:
            data["details"] = details
        # Add user shares
        for i, user in enumerate(users):
            data[f"users__{i}__user_id"] = user["user_id"]
            data[f"users__{i}__paid_share"] = str(user["paid_share"])
            data[f"users__{i}__owed_share"] = str(user["owed_share"])
        response = requests.post(url, headers=self.headers, data=data)
        response.raise_for_status()
        return response.json() 