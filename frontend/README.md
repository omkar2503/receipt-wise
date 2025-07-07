# ReceiptWise

A modern web application for splitting expenses among friends through receipt image uploads, intelligent item recognition, and customizable sharing mechanisms.

---

## Table of Contents

- [Overview](#overview)  
- [Features](#features)  
- [Tech Stack](#tech-stack)  
- [Getting Started](#getting-started)  
  - [Prerequisites](#prerequisites)  
  - [Installation](#installation)  
- [Usage Guide](#usage-guide)  
  - [Uploading a Receipt](#uploading-a-receipt)  
  - [Assigning Items](#assigning-items)  
  - [Creating an Expense](#creating-an-expense)  
- [Configuration](#configuration)  
  - [Environment Variables](#environment-variables)  
- [API Endpoints](#api-endpoints)  
- [Project Structure](#project-structure)  
- [Deployment](#deployment)  
- [Contributing](#contributing)  
- [License](#license)  

---

## Overview

**ReceiptWise** streamlines bill splitting among friends or roommates.  
Upload a photo of your receipt-our intelligent backend extracts items, prices, tax, and totals. Assign items, split by percentage, or let the app auto-distribute costs.



### Receipt Image Processing
- Upload via camera capture or file picker  
- Automatic extraction of products, prices, tax, and total  
- Live visual preview of your receipt image  

### Smart Expense Splitting
- Assign products to one or multiple participants  
- Split individual items by customizable percentage shares  
- Quick actions: **Equal Split**, **Single-user Assignment**  
- Automatic tax distribution proportional to item costs  

### User-Friendly Interface
- Drag-and-drop upload area  
- Progress indicators for assignment completion  
- Dark / Light mode support  
- Fully responsive (mobile & desktop)  

### Expense Management
- Create named expenses with descriptions  
- Designate payers and view balances  
- Group-based organization of expenses  

---

## Tech Stack

**Frontend**  
- Next.js 15.x (React)  
- TypeScript  
- Tailwind CSS  
- Shadcn UI (Radix UI primitives)  

**Backend Integration**  
- RESTful API  
- Form-data uploads for images  
- Environment variable configuration  

---

## Getting Started

### Prerequisites
- Node.js 18.x or later  
- npm, yarn, or pnpm  

### Installation

1. Clone the repo  

2. Install dependencies  
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```
3. Create your environment file  
   ```bash
   cp .env.example .env.local
   ```
4. Start the development server  
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser  

---

## Usage Guide

### Uploading a Receipt
1. Click the **Upload** area or drag & drop an image.  
2. Select your group from the dropdown.  
3. Click **Process Receipt** to extract items.

### Assigning Items
- Click on each product to assign one or multiple users.  
- Use the percentage slider for splits.  
- Quick-action buttons: **Equal Split**, **Balance**, **To Me**.  

### Creating an Expense
1. Add an expense description.  
2. Select who paid.  
3. Confirm all items show 100% assigned.  
4. Click **Save Expense**.

---

## Configuration

### Environment Variables

Rename `.env.example` to `.env.local` and set:

```
SPLIT_API_BASE_URL=http://localhost:8000
```

---

## API Endpoints

- **POST** `/api/search-products`  
  Processes receipt images → returns extracted items.  
- **POST** `/api/create-expense`  
  Creates a new expense with split details.  

---

## Project Structure

```
/
├── public/
│   └── screenshot.png
├── src/
│   ├── pages/
│   │   ├── api/
│   │   │   ├── search-products.ts
│   │   │   └── create-expense.ts
│   │   └── index.tsx
│   ├── components/
│   ├── hooks/
│   └── styles/
├── .env.example
├── package.json
└── README.md
```

---


---

## Contributing

Contributions are welcome!  

1. Fork the repo  
2. Create a feature branch  
   ```bash
   git checkout -b feature/awesome
   ```
3. Commit your changes  
   ```bash
   git commit -m "Add awesome feature"
   ```
4. Push and open a Pull Request  

---

## License

This project is licensed under the MIT License.  
See [LICENSE](LICENSE) for details.
