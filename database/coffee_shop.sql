-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: 26 أكتوبر 2026 الساعة 19:07
-- إصدار الخادم: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `coffee_shop`
--

-- --------------------------------------------------------

--
-- بنية الجدول `audit_logs`
--

CREATE TABLE `audit_logs` (
  `log_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED DEFAULT NULL,
  `action` varchar(50) NOT NULL,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` varchar(50) DEFAULT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- إرجاع أو استيراد بيانات الجدول `audit_logs`
--

INSERT INTO `audit_logs` (`log_id`, `user_id`, `action`, `entity_type`, `entity_id`, `details`, `ip_address`, `created_at`) VALUES
(1, 1, 'sale.confirm', 'order', '1', '{\"order_number\":\"CS-20261025172810-D1DBF3\",\"total\":55,\"payment_id\":1,\"idempotency_key\":\"791206b6-f714-43e6-b295-8f70f3cf132e\"}', '::1', '2026-10-26 00:28:10'),
(2, 1, 'order.status', 'order', '1', '{\"from\":\"received\",\"to\":\"preparing\",\"reason\":null}', '::1', '2026-10-26 00:29:31'),
(3, 1, 'order.status', 'order', '1', '{\"from\":\"preparing\",\"to\":\"ready\",\"reason\":null}', '::1', '2026-10-26 00:32:23'),
(4, 1, 'order.status', 'order', '1', '{\"from\":\"ready\",\"to\":\"completed\",\"reason\":null}', '::1', '2026-10-26 00:32:25'),
(5, 1, 'user.create', 'user', '2', '{\"username\":\"ahmed\",\"role\":\"cashier\"}', '::1', '2026-10-26 15:51:23'),
(6, 1, 'user.active', 'user', '2', '{\"is_active\":false}', '::1', '2026-10-26 15:52:53'),
(7, 1, 'user.active', 'user', '2', '{\"is_active\":true}', '::1', '2026-10-26 15:52:54'),
(8, 2, 'sale.confirm', 'order', '2', '{\"order_number\":\"CS-20261026085500-6863B9\",\"total\":120,\"payment_id\":2,\"idempotency_key\":\"bc6c6cd6-683a-48c7-93ff-6d816e84893e\"}', '::1', '2026-10-26 15:55:00'),
(9, 2, 'order.status', 'order', '2', '{\"from\":\"received\",\"to\":\"preparing\",\"reason\":null}', '::1', '2026-10-26 15:55:19'),
(10, 2, 'order.status', 'order', '2', '{\"from\":\"preparing\",\"to\":\"ready\",\"reason\":null}', '::1', '2026-10-26 15:55:19'),
(11, 2, 'order.status', 'order', '2', '{\"from\":\"ready\",\"to\":\"completed\",\"reason\":null}', '::1', '2026-10-26 15:55:20'),
(12, 2, 'sale.confirm', 'order', '3', '{\"order_number\":\"CS-20261026143153-6C1B5E\",\"total\":185,\"payment_id\":3,\"idempotency_key\":\"db9fa2db-ff86-4e4f-9356-3c9b351d4109\"}', '::1', '2026-10-26 21:31:53'),
(13, 2, 'order.status', 'order', '3', '{\"from\":\"received\",\"to\":\"preparing\",\"reason\":null}', '::1', '2026-10-26 21:32:17'),
(14, 2, 'order.status', 'order', '3', '{\"from\":\"preparing\",\"to\":\"ready\",\"reason\":null}', '::1', '2026-10-26 21:32:19'),
(15, 2, 'order.status', 'order', '3', '{\"from\":\"ready\",\"to\":\"completed\",\"reason\":null}', '::1', '2026-10-26 21:32:27');

-- --------------------------------------------------------

--
-- بنية الجدول `categories`
--

CREATE TABLE `categories` (
  `category_id` int(10) UNSIGNED NOT NULL,
  `category_name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- إرجاع أو استيراد بيانات الجدول `categories`
--

INSERT INTO `categories` (`category_id`, `category_name`, `description`, `is_active`, `created_at`) VALUES
(1, 'Coffee', 'Coffee drinks', 1, '2026-10-24 16:26:30'),
(2, 'Tea and Other Drinks', 'Tea and other beverages', 1, '2026-10-24 16:26:30'),
(3, 'Pastries', 'Pastries and bakery items', 1, '2026-10-24 16:26:30'),
(4, 'Tea', 'Tea beverages', 1, '2026-10-26 00:02:34'),
(5, 'Cold Drinks', 'Cold beverages', 1, '2026-10-26 00:02:34'),
(6, 'Desserts', 'Desserts and bakery', 1, '2026-10-26 00:02:34');

-- --------------------------------------------------------

--
-- بنية الجدول `ingredients`
--

CREATE TABLE `ingredients` (
  `ingredient_id` int(10) UNSIGNED NOT NULL,
  `ingredient_name` varchar(120) NOT NULL,
  `base_unit` enum('g','ml','pcs') NOT NULL,
  `minimum_stock` decimal(12,3) NOT NULL DEFAULT 0.000,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ;

--
-- إرجاع أو استيراد بيانات الجدول `ingredients`
--

INSERT INTO `ingredients` (`ingredient_id`, `ingredient_name`, `base_unit`, `minimum_stock`, `is_active`, `created_at`) VALUES
(1, 'Coffee Beans', 'g', 200.000, 1, '2026-10-26 00:17:14'),
(2, 'Milk', 'ml', 500.000, 1, '2026-10-26 00:17:14'),
(3, 'Sugar', 'g', 100.000, 1, '2026-10-26 00:17:14'),
(4, 'Chocolate Syrup', 'ml', 100.000, 1, '2026-10-26 00:17:14'),
(5, 'Tea Leaves', 'g', 100.000, 1, '2026-10-26 00:17:14'),
(6, 'Water', 'ml', 1000.000, 1, '2026-10-26 00:17:14'),
(7, 'Cake', 'pcs', 5.000, 1, '2026-10-26 00:17:14');

-- --------------------------------------------------------

--
-- بنية الجدول `inventory`
--

CREATE TABLE `inventory` (
  `ingredient_id` int(10) UNSIGNED NOT NULL,
  `quantity_on_hand` decimal(12,3) NOT NULL DEFAULT 0.000,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

--
-- إرجاع أو استيراد بيانات الجدول `inventory`
--

INSERT INTO `inventory` (`ingredient_id`, `quantity_on_hand`, `updated_at`) VALUES
(1, 4910.000, '2026-10-26 21:31:53'),
(2, 4700.000, '2026-10-26 21:31:53'),
(3, 2000.000, '2026-10-26 00:23:05'),
(4, 1000.000, '2026-10-26 00:23:05'),
(5, 1000.000, '2026-10-26 00:23:05'),
(6, 9500.000, '2026-10-26 15:55:00'),
(7, 19.000, '2026-10-26 21:31:53');

-- --------------------------------------------------------

--
-- بنية الجدول `orders`
--

CREATE TABLE `orders` (
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `order_number` varchar(30) NOT NULL,
  `idempotency_key` varchar(100) NOT NULL,
  `cashier_id` int(10) UNSIGNED NOT NULL,
  `order_status` enum('received','preparing','ready','completed','cancelled') NOT NULL DEFAULT 'received',
  `subtotal` decimal(12,2) NOT NULL,
  `total_amount` decimal(12,2) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `paid_at` datetime DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `cancelled_by` int(10) UNSIGNED DEFAULT NULL,
  `cancellation_reason` varchar(255) DEFAULT NULL
) ;

--
-- إرجاع أو استيراد بيانات الجدول `orders`
--

INSERT INTO `orders` (`order_id`, `order_number`, `idempotency_key`, `cashier_id`, `order_status`, `subtotal`, `total_amount`, `created_at`, `paid_at`, `cancelled_at`, `cancelled_by`, `cancellation_reason`) VALUES
(1, 'CS-20261025172810-D1DBF3', '791206b6-f714-43e6-b295-8f70f3cf132e', 1, 'completed', 55.00, 55.00, '2026-10-26 00:28:10', '2026-10-26 00:28:10', NULL, NULL, NULL),
(2, 'CS-20261026085500-6863B9', 'bc6c6cd6-683a-48c7-93ff-6d816e84893e', 2, 'completed', 120.00, 120.00, '2026-10-26 15:55:00', '2026-10-26 15:55:00', NULL, NULL, NULL),
(3, 'CS-20261026143153-6C1B5E', 'db9fa2db-ff86-4e4f-9356-3c9b351d4109', 2, 'completed', 185.00, 185.00, '2026-10-26 21:31:53', '2026-10-26 21:31:53', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- بنية الجدول `order_items`
--

CREATE TABLE `order_items` (
  `order_item_id` bigint(20) UNSIGNED NOT NULL,
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` int(10) UNSIGNED NOT NULL,
  `recipe_id` int(10) UNSIGNED DEFAULT NULL,
  `product_name_snapshot` varchar(120) NOT NULL,
  `quantity` int(10) UNSIGNED NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `line_total` decimal(12,2) NOT NULL
) ;

--
-- إرجاع أو استيراد بيانات الجدول `order_items`
--

INSERT INTO `order_items` (`order_item_id`, `order_id`, `product_id`, `recipe_id`, `product_name_snapshot`, `quantity`, `unit_price`, `line_total`) VALUES
(1, 1, 2, 16, 'Americano', 1, 55.00, 55.00),
(2, 2, 2, 16, 'Americano', 1, 55.00, 55.00),
(3, 2, 4, 18, 'Cappuccino', 1, 65.00, 65.00),
(4, 3, 1, 15, 'Espresso', 1, 45.00, 45.00),
(5, 3, 4, 18, 'Cappuccino', 1, 65.00, 65.00),
(6, 3, 7, 21, 'Chocolate Cake', 1, 75.00, 75.00);

-- --------------------------------------------------------

--
-- بنية الجدول `order_item_ingredients`
--

CREATE TABLE `order_item_ingredients` (
  `order_item_ingredient_id` bigint(20) UNSIGNED NOT NULL,
  `order_item_id` bigint(20) UNSIGNED NOT NULL,
  `ingredient_id` int(10) UNSIGNED NOT NULL,
  `ingredient_name_snapshot` varchar(120) NOT NULL,
  `base_unit_snapshot` enum('g','ml','pcs') NOT NULL,
  `quantity_used` decimal(12,3) NOT NULL
) ;

--
-- إرجاع أو استيراد بيانات الجدول `order_item_ingredients`
--

INSERT INTO `order_item_ingredients` (`order_item_ingredient_id`, `order_item_id`, `ingredient_id`, `ingredient_name_snapshot`, `base_unit_snapshot`, `quantity_used`) VALUES
(1, 1, 1, 'Coffee Beans', 'g', 18.000),
(2, 1, 6, 'Water', 'ml', 250.000),
(3, 2, 1, 'Coffee Beans', 'g', 18.000),
(4, 2, 6, 'Water', 'ml', 250.000),
(5, 3, 1, 'Coffee Beans', 'g', 18.000),
(6, 3, 2, 'Milk', 'ml', 150.000),
(7, 4, 1, 'Coffee Beans', 'g', 18.000),
(8, 5, 1, 'Coffee Beans', 'g', 18.000),
(9, 5, 2, 'Milk', 'ml', 150.000),
(10, 6, 7, 'Cake', 'pcs', 1.000);

-- --------------------------------------------------------

--
-- بنية الجدول `payments`
--

CREATE TABLE `payments` (
  `payment_id` bigint(20) UNSIGNED NOT NULL,
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `payment_method` enum('cash') NOT NULL DEFAULT 'cash',
  `amount` decimal(12,2) NOT NULL,
  `payment_status` enum('pending','paid','failed','voided') NOT NULL DEFAULT 'pending',
  `received_by` int(10) UNSIGNED NOT NULL,
  `paid_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ;

--
-- إرجاع أو استيراد بيانات الجدول `payments`
--

INSERT INTO `payments` (`payment_id`, `order_id`, `payment_method`, `amount`, `payment_status`, `received_by`, `paid_at`, `created_at`) VALUES
(1, 1, 'cash', 55.00, 'paid', 1, '2026-10-26 00:28:10', '2026-10-26 00:28:10'),
(2, 2, 'cash', 120.00, 'paid', 2, '2026-10-26 15:55:00', '2026-10-26 15:55:00'),
(3, 3, 'cash', 185.00, 'paid', 2, '2026-10-26 21:31:53', '2026-10-26 21:31:53');

-- --------------------------------------------------------

--
-- بنية الجدول `products`
--

CREATE TABLE `products` (
  `product_id` int(10) UNSIGNED NOT NULL,
  `category_id` int(10) UNSIGNED NOT NULL,
  `product_name` varchar(120) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `selling_price` decimal(10,2) NOT NULL,
  `is_available` tinyint(1) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

--
-- إرجاع أو استيراد بيانات الجدول `products`
--

INSERT INTO `products` (`product_id`, `category_id`, `product_name`, `description`, `selling_price`, `is_available`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 1, 'Espresso', 'Classic espresso', 45.00, 1, 1, '2026-10-26 00:02:34', '2026-10-26 00:02:34'),
(2, 1, 'Americano', 'Espresso with water', 55.00, 1, 1, '2026-10-26 00:02:34', '2026-10-26 00:02:34'),
(3, 1, 'Latte', 'Espresso with milk', 65.00, 1, 1, '2026-10-26 00:02:34', '2026-10-26 00:02:34'),
(4, 1, 'Cappuccino', 'Espresso with steamed milk foam', 65.00, 1, 1, '2026-10-26 00:02:34', '2026-10-26 00:02:34'),
(5, 4, 'Thai Milk Tea', 'Thai tea with milk', 45.00, 1, 1, '2026-10-26 00:02:34', '2026-10-26 00:02:34'),
(6, 5, 'Iced Chocolate', 'Chilled chocolate drink', 60.00, 1, 1, '2026-10-26 00:02:34', '2026-10-26 00:02:34'),
(7, 6, 'Chocolate Cake', 'Chocolate cake slice', 75.00, 1, 1, '2026-10-26 00:02:34', '2026-10-26 00:02:34');

-- --------------------------------------------------------

--
-- بنية الجدول `recipes`
--

CREATE TABLE `recipes` (
  `recipe_id` int(10) UNSIGNED NOT NULL,
  `product_id` int(10) UNSIGNED NOT NULL,
  `created_by` int(10) UNSIGNED NOT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- إرجاع أو استيراد بيانات الجدول `recipes`
--

INSERT INTO `recipes` (`recipe_id`, `product_id`, `created_by`, `updated_at`) VALUES
(15, 1, 1, '2026-10-26 00:23:05'),
(16, 2, 1, '2026-10-26 00:23:05'),
(17, 3, 1, '2026-10-26 00:23:05'),
(18, 4, 1, '2026-10-26 00:23:05'),
(19, 5, 1, '2026-10-26 00:23:05'),
(20, 6, 1, '2026-10-26 00:23:05'),
(21, 7, 1, '2026-10-26 00:23:05');

-- --------------------------------------------------------

--
-- بنية الجدول `recipe_items`
--

CREATE TABLE `recipe_items` (
  `recipe_item_id` int(10) UNSIGNED NOT NULL,
  `recipe_id` int(10) UNSIGNED NOT NULL,
  `ingredient_id` int(10) UNSIGNED NOT NULL,
  `quantity_required` decimal(12,3) NOT NULL
) ;

--
-- إرجاع أو استيراد بيانات الجدول `recipe_items`
--

INSERT INTO `recipe_items` (`recipe_item_id`, `recipe_id`, `ingredient_id`, `quantity_required`) VALUES
(3, 15, 1, 18.000),
(4, 16, 1, 18.000),
(5, 16, 6, 250.000),
(6, 17, 1, 18.000),
(7, 17, 2, 200.000),
(8, 18, 1, 18.000),
(9, 18, 2, 150.000),
(10, 19, 5, 20.000),
(11, 19, 2, 150.000),
(12, 19, 3, 15.000),
(13, 19, 6, 150.000),
(14, 20, 4, 30.000),
(15, 20, 2, 200.000),
(16, 20, 6, 100.000),
(17, 21, 7, 1.000);

-- --------------------------------------------------------

--
-- بنية الجدول `refunds`
--

CREATE TABLE `refunds` (
  `refund_id` bigint(20) UNSIGNED NOT NULL,
  `payment_id` bigint(20) UNSIGNED NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `reason` varchar(255) NOT NULL,
  `processed_by` int(10) UNSIGNED NOT NULL,
  `refund_status` enum('pending','completed','failed') NOT NULL DEFAULT 'pending',
  `processed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ;

-- --------------------------------------------------------

--
-- بنية الجدول `roles`
--

CREATE TABLE `roles` (
  `role_id` tinyint(3) UNSIGNED NOT NULL,
  `role_name` varchar(30) NOT NULL,
  `description` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- إرجاع أو استيراد بيانات الجدول `roles`
--

INSERT INTO `roles` (`role_id`, `role_name`, `description`) VALUES
(1, 'manager', 'Full management access'),
(2, 'cashier', 'Point of sale and order processing');

-- --------------------------------------------------------

--
-- بنية الجدول `stock_movements`
--

CREATE TABLE `stock_movements` (
  `movement_id` bigint(20) UNSIGNED NOT NULL,
  `ingredient_id` int(10) UNSIGNED NOT NULL,
  `order_id` bigint(20) UNSIGNED DEFAULT NULL,
  `movement_type` enum('purchase','sale','waste','adjustment','reversal') NOT NULL,
  `quantity_change` decimal(12,3) NOT NULL,
  `performed_by` int(10) UNSIGNED NOT NULL,
  `note` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- إرجاع أو استيراد بيانات الجدول `stock_movements`
--

INSERT INTO `stock_movements` (`movement_id`, `ingredient_id`, `order_id`, `movement_type`, `quantity_change`, `performed_by`, `note`, `created_at`) VALUES
(1, 1, 1, 'sale', -18.000, 1, 'Sale CS-20261025172810-D1DBF3', '2026-10-26 00:28:10'),
(2, 6, 1, 'sale', -250.000, 1, 'Sale CS-20261025172810-D1DBF3', '2026-10-26 00:28:10'),
(3, 1, 2, 'sale', -36.000, 2, 'Sale CS-20261026085500-6863B9', '2026-10-26 15:55:00'),
(4, 6, 2, 'sale', -250.000, 2, 'Sale CS-20261026085500-6863B9', '2026-10-26 15:55:00'),
(5, 2, 2, 'sale', -150.000, 2, 'Sale CS-20261026085500-6863B9', '2026-10-26 15:55:00'),
(6, 1, 3, 'sale', -36.000, 2, 'Sale CS-20261026143153-6C1B5E', '2026-10-26 21:31:53'),
(7, 2, 3, 'sale', -150.000, 2, 'Sale CS-20261026143153-6C1B5E', '2026-10-26 21:31:53'),
(8, 7, 3, 'sale', -1.000, 2, 'Sale CS-20261026143153-6C1B5E', '2026-10-26 21:31:53');

-- --------------------------------------------------------

--
-- بنية الجدول `users`
--

CREATE TABLE `users` (
  `user_id` int(10) UNSIGNED NOT NULL,
  `role_id` tinyint(3) UNSIGNED NOT NULL,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- إرجاع أو استيراد بيانات الجدول `users`
--

INSERT INTO `users` (`user_id`, `role_id`, `username`, `password_hash`, `full_name`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 1, 'manager', '$2b$12$WNwek69GmpRdgS7ojBdyCO7/eXGPKZAm/LW78.ED7Dl28m5sCnxIi', 'Coffee Shop Manager', 1, '2026-10-25 03:32:54', '2026-10-25 03:32:54'),
(2, 2, 'ahmed', '$2b$12$67RmrlyHRlUVzOkf6pmTVuKf5HCVRIyAw1vx25mLG6x.1ph4yg7TC', 'ahmed ismail', 1, '2026-10-26 15:51:23', '2026-10-26 15:52:54');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`log_id`),
  ADD KEY `fk_audit_user` (`user_id`),
  ADD KEY `idx_audit_date` (`created_at`),
  ADD KEY `idx_audit_entity` (`entity_type`,`entity_id`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`category_id`),
  ADD UNIQUE KEY `category_name` (`category_name`);

--
-- Indexes for table `ingredients`
--
ALTER TABLE `ingredients`
  ADD PRIMARY KEY (`ingredient_id`),
  ADD UNIQUE KEY `ingredient_name` (`ingredient_name`);

--
-- Indexes for table `inventory`
--
ALTER TABLE `inventory`
  ADD PRIMARY KEY (`ingredient_id`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`order_id`),
  ADD UNIQUE KEY `order_number` (`order_number`),
  ADD UNIQUE KEY `idempotency_key` (`idempotency_key`),
  ADD KEY `fk_orders_cashier` (`cashier_id`),
  ADD KEY `fk_orders_cancelled_by` (`cancelled_by`);

--
-- Indexes for table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`order_item_id`),
  ADD KEY `fk_order_items_order` (`order_id`),
  ADD KEY `fk_order_items_product` (`product_id`),
  ADD KEY `fk_order_items_recipe` (`recipe_id`);

--
-- Indexes for table `order_item_ingredients`
--
ALTER TABLE `order_item_ingredients`
  ADD PRIMARY KEY (`order_item_ingredient_id`),
  ADD UNIQUE KEY `uq_order_item_ingredient` (`order_item_id`,`ingredient_id`),
  ADD KEY `fk_order_item_ingredients_ingredient` (`ingredient_id`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`payment_id`),
  ADD UNIQUE KEY `order_id` (`order_id`),
  ADD KEY `fk_payments_user` (`received_by`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`product_id`),
  ADD KEY `fk_products_category` (`category_id`);

--
-- Indexes for table `recipes`
--
ALTER TABLE `recipes`
  ADD PRIMARY KEY (`recipe_id`),
  ADD UNIQUE KEY `product_id` (`product_id`),
  ADD KEY `fk_recipes_user` (`created_by`);

--
-- Indexes for table `recipe_items`
--
ALTER TABLE `recipe_items`
  ADD PRIMARY KEY (`recipe_item_id`),
  ADD UNIQUE KEY `uq_recipe_ingredient` (`recipe_id`,`ingredient_id`),
  ADD KEY `fk_recipe_items_ingredient` (`ingredient_id`);

--
-- Indexes for table `refunds`
--
ALTER TABLE `refunds`
  ADD PRIMARY KEY (`refund_id`),
  ADD KEY `fk_refunds_payment` (`payment_id`),
  ADD KEY `fk_refunds_user` (`processed_by`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`role_id`),
  ADD UNIQUE KEY `role_name` (`role_name`);

--
-- Indexes for table `stock_movements`
--
ALTER TABLE `stock_movements`
  ADD PRIMARY KEY (`movement_id`),
  ADD KEY `fk_stock_user` (`performed_by`),
  ADD KEY `idx_stock_ingredient_date` (`ingredient_id`,`created_at`),
  ADD KEY `idx_stock_order` (`order_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD KEY `fk_users_role` (`role_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `log_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `category_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `ingredients`
--
ALTER TABLE `ingredients`
  MODIFY `ingredient_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `order_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `order_item_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `order_item_ingredients`
--
ALTER TABLE `order_item_ingredients`
  MODIFY `order_item_ingredient_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `payment_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `product_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `recipes`
--
ALTER TABLE `recipes`
  MODIFY `recipe_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `recipe_items`
--
ALTER TABLE `recipe_items`
  MODIFY `recipe_item_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `refunds`
--
ALTER TABLE `refunds`
  MODIFY `refund_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `role_id` tinyint(3) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `stock_movements`
--
ALTER TABLE `stock_movements`
  MODIFY `movement_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- قيود الجداول المُلقاة.
--

--
-- قيود الجداول `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

--
-- قيود الجداول `inventory`
--
ALTER TABLE `inventory`
  ADD CONSTRAINT `fk_inventory_ingredient` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`ingredient_id`);

--
-- قيود الجداول `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `fk_orders_cancelled_by` FOREIGN KEY (`cancelled_by`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `fk_orders_cashier` FOREIGN KEY (`cashier_id`) REFERENCES `users` (`user_id`);

--
-- قيود الجداول `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`),
  ADD CONSTRAINT `fk_order_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`),
  ADD CONSTRAINT `fk_order_items_recipe` FOREIGN KEY (`recipe_id`) REFERENCES `recipes` (`recipe_id`);

--
-- قيود الجداول `order_item_ingredients`
--
ALTER TABLE `order_item_ingredients`
  ADD CONSTRAINT `fk_order_item_ingredients_ingredient` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`ingredient_id`),
  ADD CONSTRAINT `fk_order_item_ingredients_item` FOREIGN KEY (`order_item_id`) REFERENCES `order_items` (`order_item_id`);

--
-- قيود الجداول `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `fk_payments_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`),
  ADD CONSTRAINT `fk_payments_user` FOREIGN KEY (`received_by`) REFERENCES `users` (`user_id`);

--
-- قيود الجداول `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`);

--
-- قيود الجداول `recipes`
--
ALTER TABLE `recipes`
  ADD CONSTRAINT `fk_recipes_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`),
  ADD CONSTRAINT `fk_recipes_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);

--
-- قيود الجداول `recipe_items`
--
ALTER TABLE `recipe_items`
  ADD CONSTRAINT `fk_recipe_items_ingredient` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`ingredient_id`),
  ADD CONSTRAINT `fk_recipe_items_recipe` FOREIGN KEY (`recipe_id`) REFERENCES `recipes` (`recipe_id`);

--
-- قيود الجداول `refunds`
--
ALTER TABLE `refunds`
  ADD CONSTRAINT `fk_refunds_payment` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`payment_id`),
  ADD CONSTRAINT `fk_refunds_user` FOREIGN KEY (`processed_by`) REFERENCES `users` (`user_id`);

--
-- قيود الجداول `stock_movements`
--
ALTER TABLE `stock_movements`
  ADD CONSTRAINT `fk_stock_ingredient` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`ingredient_id`),
  ADD CONSTRAINT `fk_stock_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`),
  ADD CONSTRAINT `fk_stock_user` FOREIGN KEY (`performed_by`) REFERENCES `users` (`user_id`);

--
-- قيود الجداول `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
