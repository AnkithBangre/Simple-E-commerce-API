# Simple E-commerce API

A full-featured e-commerce API built with Node.js and Express, featuring JWT authentication, product management, shopping cart functionality, and order processing.

## Features

### Core Functionality
- **Product Listings** - Browse products with pagination and search
- **Cart Management** - Add, update, and remove items from shopping cart
- **Order Creation** - Create orders from cart items
- **User Authentication** - JWT-based login and registration system
- **User Roles** - Customer and Admin role-based access control

### Customer Features
- View and search products by name or category
- Add products to shopping cart with quantity selection
- Update cart items and quantities
- Remove items from cart
- Create orders from cart items
- View order history

### Admin Features
- All customer features
- Add new products
- Edit existing products
- Delete products
- View all customer orders
- Manage product inventory

### Additional Features
- **Pagination** - Product listing with page-based navigation
- **Search & Filter** - Search products by name and filter by category
- **Stock Management** - Automatic inventory updates on orders
- **Responsive Frontend** - Modern HTML/CSS/JavaScript interface

## Tech Stack

- **Backend**: Node.js, Express.js
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Storage**: In-memory (for demo purposes)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd simple-ecommerce-api
