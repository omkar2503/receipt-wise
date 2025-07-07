import logging
import os
import base64
import io
from typing import Optional, Dict, Any, Union, List, Tuple
from PIL import Image

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from models.receipt import ReceiptData

# Configure module logger
logger = logging.getLogger(__name__)

# Module-level cache for model instances
_MODEL_INSTANCES = {}

class Gemini:
    """
    Class for interacting with Google's Gemini LLM API to process receipt images.
    
    This class handles image encoding, LLM initialization, and receipt data extraction.
    Optimized for high performance in production environments.
    """
    
    def __init__(self, 
                model: str = "gemini-2.5-flash-preview-04-17", 
                temperature: float = 0, 
                max_tokens: Optional[int] = None, 
                timeout: int = 60,  # Added default timeout
                max_retries: int = 2):
        """
        Initialize the Gemini model connection
        
        Args:
            model: The Gemini model to use
            temperature: Randomness control (0 to 1)
            max_tokens: Maximum tokens to generate
            timeout: Request timeout in seconds
            max_retries: Maximum number of retries on failure
        """
        # Initialize API key only once per application
        self._ensure_api_key()
        
        # Use cached model instance if available
        model_key = f"{model}_{temperature}_{max_tokens}_{timeout}_{max_retries}"
        if model_key in _MODEL_INSTANCES:
            logger.debug(f"Using cached model instance for {model}")
            self.llm = _MODEL_INSTANCES[model_key]
        else:
            # Initialize the model
            try:
                logger.debug(f"Creating new model instance for {model}")
                self.llm = ChatGoogleGenerativeAI(
                    model=model,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    timeout=timeout,
                    max_retries=max_retries,
                )
                # Cache the model instance
                _MODEL_INSTANCES[model_key] = self.llm
                logger.info(f"Gemini model {model} initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Gemini model: {str(e)}", exc_info=True)
                raise
        
        # Default system prompt
        self.systemPrompt = "You are a receipt processing assistant. Extract all items, costs, tax, and total amount."
    
    @staticmethod
    def _ensure_api_key():
        """Ensure API key is loaded (done only once)"""
        if not os.getenv("GOOGLE_API_KEY"):
            load_dotenv()
            api_key = os.getenv("GOOGLE_API_KEY")
            
            if not api_key:
                logger.error("GOOGLE_API_KEY environment variable not set")
                raise ValueError("GOOGLE_API_KEY environment variable is required")
            
            os.environ["GOOGLE_API_KEY"] = api_key
    
    def setSystemPrompt(self, prompt: str) -> None:
        """
        Update the system prompt used for interactions
        
        Args:
            prompt: New system prompt text
        """
        logger.debug(f"Setting new system prompt: {prompt[:50]}...")
        self.systemPrompt = prompt

    def _optimize_and_encode_image(self, imagePath: str, max_size: Tuple[int, int] = (1000, 1000)) -> str:
        """
        Optimize and encode an image file to base64
        
        Args:
            imagePath: Path to the image file
            max_size: Maximum dimensions for image optimization
            
        Returns:
            base64 encoded string
        """
        if not os.path.exists(imagePath):
            logger.error(f"Image file not found: {imagePath}")
            raise FileNotFoundError(f"Image file not found: {imagePath}")
            
        try:
            # Open and optimize image
            with Image.open(imagePath) as img:                
                # Save to memory buffer
                buffer = io.BytesIO()
                img.save(buffer, format="JPEG", quality=85, optimize=True)
                buffer.seek(0)
                
                # Encode
                encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
                logger.debug(f"Successfully optimized and encoded image: {imagePath}")
                return encoded
                
        except Exception as e:
            logger.error(f"Failed to encode image {imagePath}: {str(e)}", exc_info=True)
            raise
        
    def extractFromReceipt(self, imagePath: Union[str, List[str]] = None) -> ReceiptData:
        """
        Extract structured information from one or more receipt images
        
        Args:
            imagePath: Path to receipt image file or list of paths for multiple images
                
        Returns:
            ReceiptData: Structured receipt information including items, tax, and total
                
        Raises:
            ValueError: If no image path is provided
            FileNotFoundError: If any image file doesn't exist
            Exception: For any processing or API errors
        """
        if not imagePath:
            logger.error("No image path provided for receipt extraction")
            raise ValueError("Image path is required for receipt extraction")
        
        # Convert single path to list for uniform handling
        image_paths = [imagePath] if isinstance(imagePath, str) else imagePath
        
        if not image_paths:
            logger.error("Empty list of image paths provided")
            raise ValueError("At least one image path is required")
        
        logger.info(f"Processing {len(image_paths)} receipt image(s)")
        
        try:
            # Create content list starting with text prompt
            content = [
                {"type": "text", "text": "Extract all relevant information from this receipt - items purchased, tax and total amount."}
            ]
            
            # Process each image
            for img_path in image_paths:
                logger.debug(f"Processing image: {img_path}")
                
                # Optimize and encode each image
                encoded_image = self._optimize_and_encode_image(img_path)
                
                # Add image to content
                content.append({
                    "type": "image_url", 
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{encoded_image}", 
                        "detail": "high"
                    }
                })
            
            # Create a multimodal message with text and images
            human_message = HumanMessage(content=content)
            
            # Create messages with system prompt and multimodal human message
            messages = [
                SystemMessage(content=self.systemPrompt),
                human_message,
            ]
            
            # Get structured output
            logger.info(f"Sending request to Gemini API with {len(image_paths)} images")
            structured_llm = self.llm.with_structured_output(ReceiptData)
            response = structured_llm.invoke(messages)
            
            # Validate response
            if not response:
                logger.error("Received empty response from Gemini API")
                raise ValueError("Failed to extract receipt data: Empty response")
            
            logger.info(f"Successfully extracted receipt with {len(response.items)} items")
            return response
            
        except FileNotFoundError as e:
            # Re-raise file not found errors
            logger.error(f"File not found: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error extracting receipt data: {str(e)}", exc_info=True)
            raise ValueError(f"Failed to extract receipt data: {str(e)}")