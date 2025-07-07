import logging
from typing import List, Union, Dict, Any, Optional
from decimal import Decimal, ROUND_HALF_UP

from models.expenseRequest import userSplit

# Configure module logger
logger = logging.getLogger(__name__)

class ExpenseCalculator:
    """
    Class to calculate and validate expense shares for a group of users
    
    This class handles validation of expense distributions to ensure
    that the total amount paid equals the total amount owed across all users.
    """
    
    def __init__(self):
        """Initialize the ExpenseCalculator"""
        logger.debug("ExpenseCalculator initialized")
    
    def validateExpenseData(self, expenseData: List[userSplit]) -> Union[float, bool]:
        """
        Validate that expense shares are correct and balanced
        
        Ensures that the total amount paid equals the total amount owed
        within a small tolerance to account for floating point precision issues.
        
        Args:
            expenseData: List of userSplit objects containing payment information
            
        Returns:
            float: Total amount owed if valid
            bool: False if the expense data is invalid
        """
        if not expenseData:
            logger.error("No expense data provided for validation")
            return False
            
        try:
            # Calculate totals with precise decimal handling
            totalPaid = sum(Decimal(str(userData.paid)) for userData in expenseData)
            totalOwed = sum(Decimal(str(userData.owed)) for userData in expenseData)
            
            # Convert back to float for compatibility with the rest of the system
            totalPaidFloat = float(totalPaid)
            totalOwedFloat = float(totalOwed)
            
            logger.info(f"Validating expense data: Total paid: {totalPaidFloat}, Total owed: {totalOwedFloat}")
            
            # Check if totals match within tolerance
            if abs(totalPaidFloat - totalOwedFloat) > 0.03:  # Reduce tolerance for stricter validation
                logger.error(f"Expense splits don't balance: Paid {totalPaidFloat} != Owed {totalOwedFloat}")
                return False
            
            # Log individual splits for audit trail
            logger.info("Expense splits breakdown:")
            for userData in expenseData:
                if userData.paid > 0 or userData.owed > 0:
                    logger.info(f"User {userData.name} (ID: {userData.id}): paid {userData.paid}, owes {userData.owed}")
            
            return totalOwedFloat
        
        except Exception as e:
            logger.error(f"Error validating expense data: {str(e)}", exc_info=True)
            return False
    
    @staticmethod
    def roundCurrency(amount: float) -> float:
        """
        Round a currency amount to 2 decimal places
        
        Args:
            amount: The amount to round
            
        Returns:
            float: The rounded amount
        """
        # Use Decimal for accurate financial rounding
        decimal_amount = Decimal(str(amount))
        rounded = decimal_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        return float(rounded)

