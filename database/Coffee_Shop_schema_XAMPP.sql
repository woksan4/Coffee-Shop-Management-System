-- Coffee Shop Management System
-- MySQL 8.0+. Creates a new database; does not drop or modify existing databases.
CREATE DATABASE IF NOT EXISTS coffee_shop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE coffee_shop;

CREATE TABLE IF NOT EXISTS roles (
  role_id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  role_name VARCHAR(30) NOT NULL UNIQUE,
  description VARCHAR(255) NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  user_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  role_id TINYINT UNSIGNED NOT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(role_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categories (
  category_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS products (
  product_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id INT UNSIGNED NOT NULL,
  product_name VARCHAR(120) NOT NULL,
  description VARCHAR(255) NULL,
  selling_price DECIMAL(10,2) NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_products_price CHECK (selling_price >= 0),
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(category_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ingredients (
  ingredient_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ingredient_name VARCHAR(120) NOT NULL UNIQUE,
  base_unit ENUM('g','ml','pcs') NOT NULL,
  minimum_stock DECIMAL(12,3) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_ingredients_minimum CHECK (minimum_stock >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventory (
  ingredient_id INT UNSIGNED PRIMARY KEY,
  quantity_on_hand DECIMAL(12,3) NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_inventory_quantity CHECK (quantity_on_hand >= 0),
  CONSTRAINT fk_inventory_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS recipes (
  recipe_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id INT UNSIGNED NOT NULL UNIQUE,
  created_by INT UNSIGNED NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_recipes_product FOREIGN KEY (product_id) REFERENCES products(product_id),
  CONSTRAINT fk_recipes_user FOREIGN KEY (created_by) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS recipe_items (
  recipe_item_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  recipe_id INT UNSIGNED NOT NULL,
  ingredient_id INT UNSIGNED NOT NULL,
  quantity_required DECIMAL(12,3) NOT NULL,
  CONSTRAINT uq_recipe_ingredient UNIQUE (recipe_id, ingredient_id),
  CONSTRAINT chk_recipe_quantity CHECK (quantity_required > 0),
  CONSTRAINT fk_recipe_items_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id),
  CONSTRAINT fk_recipe_items_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
  order_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(30) NOT NULL UNIQUE,
  idempotency_key VARCHAR(100) NOT NULL UNIQUE,
  cashier_id INT UNSIGNED NOT NULL,
  order_status ENUM('received','preparing','ready','completed','cancelled') NOT NULL DEFAULT 'received',
  subtotal DECIMAL(12,2) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at DATETIME NULL,
  cancelled_at DATETIME NULL,
  cancelled_by INT UNSIGNED NULL,
  cancellation_reason VARCHAR(255) NULL,
  CONSTRAINT chk_orders_amounts CHECK (subtotal >= 0 AND total_amount >= 0),
  CONSTRAINT fk_orders_cashier FOREIGN KEY (cashier_id) REFERENCES users(user_id),
  CONSTRAINT fk_orders_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
  order_item_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  recipe_id INT UNSIGNED NULL,
  product_name_snapshot VARCHAR(120) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(12,2) NOT NULL,
  CONSTRAINT chk_order_item_values CHECK (quantity > 0 AND unit_price >= 0 AND line_total >= 0),
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(order_id),
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(product_id),
  CONSTRAINT fk_order_items_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_item_ingredients (
  order_item_ingredient_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_item_id BIGINT UNSIGNED NOT NULL,
  ingredient_id INT UNSIGNED NOT NULL,
  ingredient_name_snapshot VARCHAR(120) NOT NULL,
  base_unit_snapshot ENUM('g','ml','pcs') NOT NULL,
  quantity_used DECIMAL(12,3) NOT NULL,
  CONSTRAINT uq_order_item_ingredient UNIQUE (order_item_id, ingredient_id),
  CONSTRAINT chk_order_ingredient_quantity CHECK (quantity_used > 0),
  CONSTRAINT fk_order_item_ingredients_item FOREIGN KEY (order_item_id) REFERENCES order_items(order_item_id),
  CONSTRAINT fk_order_item_ingredients_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payments (
  payment_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL UNIQUE,
  payment_method ENUM('cash') NOT NULL DEFAULT 'cash',
  amount DECIMAL(12,2) NOT NULL,
  payment_status ENUM('pending','paid','failed','voided') NOT NULL DEFAULT 'pending',
  received_by INT UNSIGNED NOT NULL,
  paid_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_payments_amount CHECK (amount >= 0),
  CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(order_id),
  CONSTRAINT fk_payments_user FOREIGN KEY (received_by) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS refunds (
  refund_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  payment_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  processed_by INT UNSIGNED NOT NULL,
  refund_status ENUM('pending','completed','failed') NOT NULL DEFAULT 'pending',
  processed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_refund_amount CHECK (amount > 0),
  CONSTRAINT fk_refunds_payment FOREIGN KEY (payment_id) REFERENCES payments(payment_id),
  CONSTRAINT fk_refunds_user FOREIGN KEY (processed_by) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS stock_movements (
  movement_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ingredient_id INT UNSIGNED NOT NULL,
  order_id BIGINT UNSIGNED NULL,
  movement_type ENUM('purchase','sale','waste','adjustment','reversal') NOT NULL,
  quantity_change DECIMAL(12,3) NOT NULL,
  performed_by INT UNSIGNED NOT NULL,
  note VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_stock_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id),
  CONSTRAINT fk_stock_order FOREIGN KEY (order_id) REFERENCES orders(order_id),
  CONSTRAINT fk_stock_user FOREIGN KEY (performed_by) REFERENCES users(user_id),
  INDEX idx_stock_ingredient_date (ingredient_id, created_at),
  INDEX idx_stock_order (order_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  log_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(50) NULL,
  details JSON NULL,
  ip_address VARCHAR(45) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
  INDEX idx_audit_date (created_at),
  INDEX idx_audit_entity (entity_type, entity_id)
) ENGINE=InnoDB;

INSERT IGNORE INTO roles (role_name, description) VALUES
('manager', 'Full management access'),
('cashier', 'Point of sale and order processing');

INSERT IGNORE INTO categories (category_name, description) VALUES
('Coffee', 'Coffee drinks'),
('Tea and Other Drinks', 'Tea and other beverages'),
('Pastries', 'Pastries and bakery items');
