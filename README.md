# Coffee Shop Management System

A full-stack coffee shop management application developed as a university project. It supports day-to-day shop operations through a React frontend, a Node.js/Express API, and a MySQL database.

## Features

- Role-based access for managers and cashiers
- Product and category management
- Ingredient inventory tracking
- Product recipes and ingredient consumption
- Point of Sale (POS) and order processing
- Order preparation status and receipt printing
- Employee account management
- Sales reporting
- Stock movement and order records

## Technology Stack

- **Frontend:** React, Vite
- **Backend:** Node.js, Express
- **Database:** MySQL / MariaDB
- **Database administration:** phpMyAdmin (available through XAMPP)

## Requirements

Install the following before running the application:

- Node.js and npm
- XAMPP (or another compatible MySQL/MariaDB installation)
- Git (optional, for cloning the repository)

## Setup

### 1. Get the source code

Clone the repository:

```bash
git clone https://github.com/woksan4/Coffee-Shop-Management-System.git
cd Coffee-Shop-Management-System
```

Alternatively, download the repository as a ZIP file from GitHub and extract it.

### 2. Set up the database

1. Start MySQL from the XAMPP Control Panel.
2. Open phpMyAdmin at `http://localhost/phpmyadmin`.
3. Create a database named `coffee_shop` if it does not already exist.
4. Select the `coffee_shop` database and import `database/coffee_shop.sql`.

The SQL file contains the project's demonstration database. Use it only for local development and demonstrations.

### 3. Configure the backend

1. Open the `backend` directory.
2. Copy `.env.example` to a new file named `.env`.
3. Open `backend/.env` and enter the local database connection settings and other required values. Use the variable names already provided in `.env.example`.
4. Do not commit or publish `.env`; it may contain local credentials and secrets.

Install dependencies and start the API:

```bash
cd backend
npm install
npm run dev
```

Keep this terminal running. The backend is expected to use port `5000` for the local API.

### 4. Configure the frontend

In a second terminal, open the `frontend` directory and install its dependencies:

```bash
cd frontend
npm install
```

Create `frontend/.env` based on `frontend/.env.example`. For a local backend, the API URL should be:

```env
VITE_API_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm run dev
```

Open the local address printed by Vite in the terminal, usually `http://localhost:5173`.

## Project Structure

```text
Coffee-Shop-Management-System/
├── backend/       # Express API, routes, and database access
├── frontend/      # React user interface
├── database/      # SQL schema and demonstration database
├── .gitignore
└── README.md
```

## Security Notes

- Never commit `.env` files, database passwords, JWT secrets, or other private credentials.
- The included database is intended for project demonstration and local testing.
- Before deploying this application publicly, review authentication, authorization, validation, database permissions, error handling, and production configuration.

## Academic Project

This project was created for educational purposes to demonstrate full-stack application development, database integration, role-based access control, inventory management, and sales workflows.
