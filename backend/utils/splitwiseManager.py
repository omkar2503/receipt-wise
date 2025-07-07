import logging
import os
from typing import Any, Dict, List, Optional, Tuple

from dotenv import load_dotenv

# Splitwise Imports
from splitwise import Splitwise
from splitwise.expense import Expense
from splitwise.user import ExpenseUser

# Configure module logger
logger = logging.getLogger(__name__)

class SplitwiseManager:
    """
    Class for interacting with the Splitwise API to manage expenses and groups
    
    This class handles authentication with Splitwise, fetches group information,
    and creates expenses with customized splits between users.
    """
    
    def __init__(self):
        """
        Initialize the SplitwiseManager with API credentials from environment variables
        
        Raises:
            ValueError: If required environment variables are missing
        """
        logger.debug("Initializing SplitwiseManager")
        # Load environment variables from the .env file
        load_dotenv()
        
        # Initialize Splitwise client
        self.splitwise = self._get_splitwise_client()
        
        # Group mappings (ID aliases to actual Splitwise group IDs)
        self.groupUserInfo: Dict[str, int] = {}
        self.groups: Dict[str, int] = {}
        logger.debug(f"Configured with {len(self.groups)} predefined groups")
    
    def _get_splitwise_client(self) -> Splitwise:
        """
        Create a Splitwise client using environment variables
        
        Returns:
            Configured Splitwise client
            
        Raises:
            ValueError: If required environment variables are missing
        """
        # Get credentials from environment variables
        consumer_key = os.getenv("SPLITWISE_CONSUMER_KEY")
        consumer_secret = os.getenv("SPLITWISE_CONSUMER_SECRET")
        api_key = os.getenv("SPLITWISE_API_KEY")
        
        if not all([consumer_key, consumer_secret, api_key]):
            logger.error("Missing required Splitwise API credentials in environment variables")
            raise ValueError("Missing required Splitwise API credentials. Check SPLITWISE_CONSUMER_KEY, SPLITWISE_CONSUMER_SECRET, and SPLITWISE_API_KEY.")
        
        # Create new client
        try:
            client = Splitwise(consumer_key, consumer_secret, api_key=api_key)
            logger.info("Splitwise client initialized successfully")
            return client
        except Exception as e:
            logger.error(f"Failed to initialize Splitwise client: {str(e)}", exc_info=True)
            raise
    
    def _get_group(self, id: int):
        """
        Get a group by ID
        
        Args:
            id: Group ID to fetch
            
        Returns:
            Group object
        """
        return self.splitwise.getGroup(id=id)
    
    def getUsersfromGroup(self, id: Optional[int] = None) -> Dict[str, int]:
        """
        Get users from a particular Splitwise group
        
        Args:
            id: The Splitwise group ID to fetch members from
            
        Returns:
            Dict mapping user first names to their Splitwise IDs
            
        Raises:
            ValueError: If group ID is not provided or invalid
            Exception: For API errors or connection issues
        """
        if not id:
            logger.error("No group ID provided")
            raise ValueError("Group ID is required")
        
        logger.info(f"Fetching users from group ID: {id}")
        
        try:
            # Get group
            group = self._get_group(id)
            if not group:
                logger.error(f"Group not found: {id}")
                raise ValueError(f"Group not found with ID: {id}")
            
            # Process members
            result = {}
            for member in group.getMembers():
                result[member.getFirstName()] = member.getId()
            
            logger.info(f"Retrieved {len(result)} users from group {id}")
            return result
            
        except Exception as e:
            logger.error(f"Error retrieving users from group {id}: {str(e)}", exc_info=True)
            raise
            
    def createExpense(self, 
                      groupId: int, 
                      totalAmount: float, 
                      description: str, 
                      details: str | None,
                      userSplits: List[Any], 
                      receipt: Optional[str] = None
                      ) -> Tuple[Optional[int], Optional[str]]:
        """
        Create an expense in a Splitwise group with the given splits
        
        Args:
            groupId: The Splitwise group ID
            totalAmount: Total cost of the expense
            details: additonal details for the expense
            description: Description of the expense
            userSplits: List of userSplit objects with payment information
            receipt: Optional path to receipt image file
            
        Returns:
            Tuple containing:
                - Expense ID if successful, None otherwise
                - Error message if failed, None otherwise
                
        Raises:
            ValueError: For invalid inputs
            Exception: For API errors or connection issues
        """
        # Validate inputs
        if not all([groupId, totalAmount > 0, description, userSplits]):
            if not groupId:
                logger.error("No group ID provided")
                raise ValueError("Group ID is required to create an expense")
            if totalAmount <= 0:
                logger.error(f"Invalid total amount: {totalAmount}")
                raise ValueError("Total amount must be greater than zero")
            if not description:
                logger.error("No expense description provided")
                raise ValueError("Expense description is required")
            if not userSplits:
                logger.error("No user splits provided")
                raise ValueError("User splits are required to create an expense")
        
        logger.info(f"Creating expense '{description}' for {totalAmount} in group {groupId}")
        
        try:
            # Create expense object
            exp = Expense()
            exp.setGroupId(groupId)
            exp.setCost(totalAmount)
            exp.setDescription(description)
            exp.setDetails(details or "")
            
            # Check receipt existence once before setting
            receipt_exists = receipt and os.path.exists(receipt)
            if receipt_exists:
                logger.info(f"Attaching receipt: {receipt}")
                exp.setReceipt(receipt)
            elif receipt:
                logger.warning(f"Receipt file not found: {receipt}")
            
            # Process user expense splits
            userExpenses = []
            payer_found = False
            
            # Process all users
            for split in userSplits:
                userExpense = ExpenseUser()
                userExpense.setId(split.id)
                userExpense.setOwedShare(split.owed)
                
                # Set paid share
                if split.paid > 0:
                    if payer_found:
                        logger.warning("Multiple payers found, using the first one")
                    else:
                        payer_found = True
                        userExpense.setPaidShare(totalAmount)
                        logger.debug(f"User {split.id} ({split.name}) paid {totalAmount}")
                else:
                    userExpense.setPaidShare(0.0)
                    
                userExpenses.append(userExpense)
            
            exp.setUsers(userExpenses)
            
            # Create the expense
            logger.info(f"Submitting expense to Splitwise API")
            expense, errors = self.splitwise.createExpense(exp)
            
            if errors:
                error_details = errors.getErrors()
                logger.error(f"Error creating expense: {error_details}")
                return None, error_details
            else:
                expense_id = expense.getId()
                logger.info(f"Expense created successfully with ID: {expense_id}")
                return expense_id, None
                
        except Exception as e:
            logger.error(f"Unexpected error creating expense: {str(e)}", exc_info=True)
            return None, str(e)
        finally:
            # Clean up receipt in finally block for guaranteed execution
            if receipt and os.path.exists(receipt):
                try:
                    os.remove(receipt)
                    logger.debug(f"Deleted receipt file: {receipt}")
                except Exception as e:
                    logger.warning(f"Failed to delete receipt file {receipt}: {str(e)}")

    def getGroups(self) -> Dict[str, Dict[str, Any]]:
        """
        Get all groups the user is a member of
        
        Returns:
            Dict mapping group IDs to group information including name, members count, etc.
            
        Raises:
            Exception: For API errors or connection issues
        """
        logger.info("Fetching groups from Splitwise API")
        
        try:
            # Get all groups from Splitwise
            groups_list = self.splitwise.getGroups()
            
            # Process groups into a dictionary for easier access
            result = {}
            for group in groups_list:
                group_id = group.getId()
                result[str(group_id)] = {
                    "id": group_id,
                    "name": group.getName(),
                }
                
                # Also update our predefined groups mapping if needed
                for alias, gid in self.groups.items():
                    if gid == group_id:
                        result[str(group_id)]["alias"] = alias
            
            logger.info(f"Retrieved {len(result)} groups from Splitwise")
            return result
            
        except Exception as e:
            logger.error(f"Error retrieving groups: {str(e)}", exc_info=True)
            raise