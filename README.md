# Coffee Shop Management System

A clean rebuild of the university project using React, Express, and MySQL. The previous implementation is retained only as a reference; this version uses a new schema and a new API and does not depend on the old customer/table-order workflow.

## Included in this first implementation

- Manager and cashier login with role-based API authorization.
- Product catalogue and categories; cashier cannot change prices.
- Ingredient inventory with receiving, waste, and stock-count adjustments.
- One recipe per active product, with measured ingredient quantities.
- POS with a pre-payment ingredient check and a second check during the sale transaction.
- Cash sale, unique order number, inventory movements, immutable sold-item/ingredient snapshots, and receipt reprint.
- Order preparation status, cancellation records, employee account management, refund recording, sales reports, and audit log.
- Parameterized SQL, password hashing, rate-limited login, environment-based secrets, and database transactions.

## Requirements

- Node.js 20 or newer
- MySQL 8.0 or newer

## 1. Create the database

Run `database/schema.sql` in MySQL Workbench or the MySQL command line. It creates a new `coffee_shop` database and does **not** drop or overwrite any existing database.

Recommended: create a dedicated MySQL user instead of using `root`:

```sql
CREATE USER 'coffee_app'@'localhost' IDENTIFIED BY 'choose_a_strong_database_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON coffee_shop.* TO 'coffee_app'@'localhost';
FLUSH PRIVILEGES;
```

Run the schema first as a database administrator, then use the dedicated user for the application.

## 2. Configure and start the backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your database credentials. Set `JWT_SECRET` to a random secret at least 32 characters long. Add initial manager credentials to `.env`:

```env
INITIAL_MANAGER_USERNAME=manager
INITIAL_MANAGER_PASSWORD=choose_a_long_unique_password
INITIAL_MANAGER_NAME=Coffee Shop Manager
```

Then run:

```bash
npm install
npm run seed:manager
npm run dev
```

The manager seed command creates one manager account and refuses to overwrite an existing username. It does not store a default password in source code.

## 3. Start the frontend

In a second terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). The API defaults to `http://localhost:3000/api`.

## 4. Suggested first-time setup

1. Sign in as the manager.
2. In **Inventory**, add ingredients and record opening quantities as `Stock received` movements.
3. In **Products**, add products and prices.
4. In **Recipes**, define the ingredient quantities for one unit of each product.
5. Create cashier accounts in **Employees**.
6. Use **Point of Sale** to check ingredients and confirm cash sales.

Products without recipes are intentionally blocked from sale. This avoids selling a product while the system cannot calculate its ingredient consumption.

## Notes and current boundaries

- This is an educational first implementation, not a certified fiscal/POS system.
- Payment method is cash only. Refund entries must be created only after cash is actually returned.
- The first version does not include supplier management, tax rules, customer accounts, tables, delivery, manual discounts, or cashier price editing.
- The order endpoint requires an `Idempotency-Key` and stores it uniquely, so a retry with the same key returns the existing sale rather than creating another order.
- For production deployment, use HTTPS, backups, restricted network access, and a deployment-specific secret manager.
