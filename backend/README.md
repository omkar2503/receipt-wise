# ReceiptWise API

A FastAPI application that processes receipt images using Google's Gemini AI and creates expenses in Splitwise automatically.

## Table of Contents

- [Overview](#overview)  
- [Features](#features)  
- [Installation](#installation)  
- [Configuration](#configuration)  
- [API Endpoints](#api-endpoints)  
- [Usage](#usage)  
- [Project Structure](#project-structure)  
- [Technical Details](#technical-details)  
  - [Receipt Processing](#receipt-processing)  
  - [Expense Calculation](#expense-calculation)  
  - [Error Handling](#error-handling)  
  - [Performance Optimizations](#performance-optimizations)
- [Development](#development)  
  - [Running Tests](#running-tests)  
  - [Adding New Features](#adding-new-features)  
- [Security Notes](#security-notes)  
- [License](#license)  

---

## Overview

The **ReceiptWise API** is a FastAPI-based service that:

1. Accepts single or multiple receipt image uploads.  
2. Uses Google's Gemini AI to extract line items, costs, tax, and totals.  
3. Automatically creates and assigns expenses in Splitwise with proper splits.  
4. Attaches the original receipt image to the Splitwise expense.  

This automates receipt-based expense tracking and simplifies shared spending among friends, roommates, or coworkers.

---

## Features

- **Multi-Image Processing**  
  Upload and process up to 5 receipt images in a single request.
- **AI-Powered Receipt Processing**  
  Uses Google's Gemini AI to extract structured data from receipt images.  
- **Splitwise Integration**  
  Connects to your Splitwise account to create expenses automatically.  
- **Group Member Management**  
  Fetches and manages Splitwise group members for expense splitting.  
- **Expense Validation**  
  Ensures that splits add up correctly before posting.  
- **Receipt Attachment**  
  Uploads the original receipt image as an attachment to the Splitwise expense.  
- **Robust Error Handling**  
  Detailed logging, clean error responses, and automatic cleanup of temporary files.  
- **Performance Optimizations**  
  Image optimization, caching, and background task processing for high performance.

---

## Installation

1. **Clone the repository**

2. **Create & activate a virtual environment**  
   ```bash
    python3 -m venv fastapi-env
    source fastapi-env/bin/activate    # macOS/Linux
    fastapi-env\Scripts\activate       # Windows
   ```

3. **Install dependencies**  
   ```bash
   pip install -r requirements.txt
   ```

4. **Create a `.env` file**  
   See [Configuration](#configuration) for details.

---

## Configuration

Create a file named `.env` in the project root:

```dotenv
# .env
# Splitwise API Credentials
CONSUMER_SECRET=your_consumer_secret
CONSUMER_KEY=your_consumer_key
API_KEY=your_api_key

# Google Gemini API Key
GOOGLE_API_KEY=your_google_api_key
```

- **CONSUMER_SECRET, CONSUMER_KEY, API_KEY***: Your Splitwise API credentials & access token.  
- **GOOGLE_API_KEY**: Key for calling Google's Gemini AI.   

You can modify the group mapping in `splitwiseManager.py` if needed.

---

## API Endpoints

### Health Check

- **GET /**  
  Root endpoint to verify API status.

- **GET /health**  
  Returns `{ "status": "ok" }` for monitoring.


### Get Group List
- **GET /groups** 
  Get all Splitwise groups for the current user.

### Image Processing

- **POST /imageUpload**  
  Upload a receipt image and extract structured data.

  **Request** (multipart/form-data):  
  - `files`: One or more receipt image files (up to 5)
  - `groupId`: Internal group ID (string or integer)

  **Response** (200):  
  ```json
    {
      "receipt_data": {
        "items": [
          {"name":"Coffee","cost":3.50},
          {"name":"Sandwich","cost":5.00}
        ],
        "tax": 0.80,
        "total": 9.30
      },
      "members": {
        "Alice": 11111,
        "Bob": 22222
      },
      "receipt_paths": [
        "C:\\path\\to\\img\\receipt_20250515184433_d182739b_0_a123.jpg",
        "C:\\path\\to\\img\\receipt_20250515184433_d182739b_1_b456.jpg"
      ],
      "primary_receipt_path": "C:\\path\\to\\img\\receipt_20250515184433_d182739b_0_a123.jpg",
      "image_count": 2,
      "status": "success"
    }
  ```

### Expense Creation

- **POST /expenses**  
  Create an expense in Splitwise using extracted data.

  **Request** (application/json):  
  ```json
    {
      "description": "Grocery Shopping",
      "details": "ABC - user 1, user2",
      "payer": 12345,
      "totalAmount": 42.56,
      "tax": 3.56,
      "userSplits": [
        {
          "id": 12345,
          "name": "User1",
          "paid": 42.56,
          "owed": 21.28
        },
        {
          "id": 67890,
          "name": "User2",
          "paid": 0,
          "owed": 21.28
        }
      ],
      "groupId": "35",
      "receiptPath": "C:\\path\\to\\img\\receipt_20250515184433_d182739b_0_a123.jpg"
    }
  ```

  **Response** (200):  
  ```json
  {
    "expense_id": 987654321,
    "status": "success",
    "message": "Expense created successfully"
  }
  ```

---

## Usage

1. **Start the server**  
   ```bash
   uvicorn main:app --reload
   ```

2. **Upload a receipt**  
   ```bash
   curl -X POST http://localhost:8000/imageUpload \
        -F "files=@/path/to/receipt.jpg" \
        -F "groupId=1"
   ```

  **Upload multiple receipt**  
   ```bash
    curl -X POST http://localhost:8000/imageUpload \
        -F "files=@/path/to/receipt1.jpg" \
        -F "files=@/path/to/receipt2.jpg" \
        -F "groupId=35"
   ```


3. **Create an expense**  
   ```bash
    curl -X POST http://localhost:8000/expenses \
        -H "Content-Type: application/json" \
        -d '{
          "description": "Grocery Shopping",
          "details": "ABC - user 1, user2",
          "payer": 12345,
          "totalAmount": 42.56,
          "tax": 3.56,
          "userSplits": [
            {
              "id": 12345,
              "name": "User1",
              "paid": 42.56,
              "owed": 21.28
            },
            {
              "id": 67890,
              "name": "User2",
              "paid": 0,
              "owed": 21.28
            }
          ],
          "groupId": "35",
          "receiptPath": "C:\\path\\to\\img\\receipt_20250515184433_d182739b_0_a123.jpg"
        }'
   ```

---

## Project Structure

```
├── main.py                 # FastAPI app & endpoint definitions
├── models/                 # Pydantic data models
│   ├── expenseRequest.py   # Expense request models
│   └── receipt.py          # Receipt data models
├── utils/                  # Utility modules
│   ├── expenseCalculator.py # Validates expense splits
│   ├── gemini.py           # Google Gemini AI integration
│   └── splitwiseManager.py # Splitwise API integration
├── img/                    # Temporary receipt image storage
├── requirements.txt        # Python dependencies
└── .env                    # Environment variables (not in source control)
```

---

## Technical Details

### Receipt Processing

- Uses Google's Gemini AI to parse receipt images.  
- Supports multi-image processing for complex or multi-page receipts.
- Extracts:
  - Line items (name & cost)  
  - Tax amounts  
  - Total amount  

### Expense Calculation

- `ExpenseCalculator` ensures:
  - Sum of individual shares equals the total (within a small epsilon).  
  - No missing or negative values.  
  - Uses Decimal for precise financial calculations.

### Error Handling

- Detailed logging at every stage.  
- Returns clear JSON error responses with appropriate HTTP status codes.  
- Cleans up temporary receipt files upon success or failure.

---

## Development

### Running Tests

```bash
pytest --cov=.
```

### Adding New Features

1. Add utility functions in `utils/`.  
2. Create or update Pydantic models in `models.py`.  
3. Add or extend endpoints in `main.py`.  
4. Write corresponding tests in `tests/`.

---

## Security Notes

- **.env** files must **never** be committed to source control.  
- Input is validated to prevent injection attacks.  
- Receipt images are stored only temporarily and cleaned up immediately.
- File size and count limits to prevent abuse.

---

## License

This project is licensed under the MIT License.  
See [LICENSE](LICENSE) for details.

