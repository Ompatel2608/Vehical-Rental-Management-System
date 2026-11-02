# AutoRent - Vehicle Rental Management System

A full-stack **Vehicle Rental Management System** built for a Database Management Systems (DBMS) college project.

---

## 🚀 Tech Stack

- **Frontend:** Plain HTML5, Modern CSS3, and Vanilla JavaScript (ES6+). Exactly 3 files (`index.html`, `style.css`, `script.js`) in `/frontend`. No external frontend frameworks or heavy dependencies; clean SVG icons and asynchronous `fetch()` API calls.
- **Backend:** Node.js with Express.js in `/backend`. Uses `pg` (node-postgres connection pool) for secure parameterized SQL queries, `cors`, and `dotenv`.
- **Database:** PostgreSQL with an existing normalized schema in `/database/schema.sql`.

---

## 🗄️ Database Schema & Relationships

The database utilizes the exact schema defined in `/database/schema.sql`:

### 1. Tables Overview

| Table Name | Description | Key Columns |
| :--- | :--- | :--- |
| `users` | Customers & system users | `user_id` (PK), `name`, `email` (UQ), `license_no` (UQ), `phone`, `address`, `role` |
| `branches` | Rental company branch locations | `branch_id` (PK), `branch_name`, `address`, `contact_no` |
| `vehicle_categories` | Vehicle types (Car, Bike, SUV) | `category_id` (PK), `category_name` (UQ), `description` |
| `vehicles` | Fleet inventory & rates | `vehicle_id` (PK), `reg_no` (UQ), `model`, `daily_rate`, `status`, `category_id` (FK), `branch_id` (FK) |
| `bookings` | Customer rental reservations | `booking_id` (PK), `booking_date`, `start_date`, `end_date`, `total_amount`, `user_id` (FK), `vehicle_id` (FK), `status` |
| `payments` | Rental transactions & billing | `payment_id` (PK), `payment_date`, `payment_method`, `amount`, `status`, `booking_id` (FK, UQ) |
| `reviews` | Customer feedback on rentals | `review_id` (PK), `review_text`, `rating`, `user_id` (FK), `payment_id` (FK, UQ) |
| `maintenance_records`| Vehicle service and repair logs | `maintenance_id` (PK), `service_date`, `details`, `cost`, `vehicle_id` (FK) |
| `insurance` | Vehicle insurance policies | `insurance_id` (PK), `policy_no` (UQ), `provider_name`, `policy_date`, `valid_until`, `vehicle_id` (FK, UQ) |
| `employees` | Branch workforce records | `employee_id` (PK), `name`, `position`, `phone`, `email` (UQ), `branch_id` (FK) |

### 2. Entity Relationships
- **Customers to Bookings:** One-to-Many (`users.user_id` → `bookings.user_id`).
- **Vehicles to Bookings:** One-to-Many (`vehicles.vehicle_id` → `bookings.vehicle_id`).
- **Categories to Vehicles:** One-to-Many (`vehicle_categories.category_id` → `vehicles.category_id`).
- **Branches to Vehicles:** One-to-Many (`branches.branch_id` → `vehicles.branch_id`).
- **Branches to Employees:** One-to-Many (`branches.branch_id` → `employees.branch_id`).
- **Bookings to Payments:** One-to-One (`bookings.booking_id` → `payments.booking_id`).
- **Vehicles to Insurance:** One-to-One (`vehicles.vehicle_id` → `insurance.vehicle_id`).
- **Vehicles to Maintenance:** One-to-Many (`vehicles.vehicle_id` → `maintenance_records.vehicle_id`).

### 3. Business Rules & Database Constraints
- **Vehicle Availability:** `vehicles.status` is checked via `check_vehicle_status` (`'Available'`, `'Maintenance'`, `'Inactive'`). When a booking is confirmed, the vehicle is marked `'Inactive'`. Upon return or cancellation, it is restored to `'Available'`.
- **Booking Date Integrity:** `bookings.end_date > bookings.start_date`.
- **Positive Pricing:** `vehicles.daily_rate > 0`, `bookings.total_amount >= 0`, `payments.amount >= 0`.
- **Allowed Payment Methods:** `'Cash'`, `'UPI'`, `'Card'`.
- **Allowed Payment Statuses:** `'Pending'`, `'Paid'`, `'Failed'`, `'Refunded'`.

---

## ✨ Features Implemented

1. **Dashboard:**
   - Real-time KPI summary: Total Vehicles, Available Vehicles, Active Rentals, Total Customers, and Total Paid Revenue.
   - Recent Bookings log with customer names, vehicle models, dates, amounts, and payment status badges.
   - Fleet Category Distribution (Cars, Bikes, SUVs).
2. **Vehicle Management:**
   - Full CRUD: View, Add, Edit, and Delete vehicles.
   - Dynamic search by model name and registration number.
   - Filter by vehicle category and availability status.
   - Preloaded categories and branches from PostgreSQL foreign keys.
3. **Customer Management:**
   - Full CRUD: View, Add, Edit, and Delete customers.
   - Live search by Name, Email, Phone, and Driving License Number.
   - Unique constraint validation for Email and License Number.
4. **Bookings & Rentals:**
   - Create new bookings by selecting Customer, Available Vehicle, and Date range.
   - Live cost auto-calculation in the booking modal (`Days × Daily Rate`).
   - Atomic database transactions: inserts booking, marks vehicle unavailable (`status = 'Inactive'`), and creates an initial pending payment record.
   - Vehicle Return workflow: marks booking as `Completed` and restores vehicle status to `Available`.
   - Cancellation workflow: marks booking as `Cancelled` and restores vehicle status to `Available`.
5. **Payments & Billing:**
   - Record and update payments via Cash, UPI, or Card.
   - Automatic upsert logic respecting the `payments_booking_id_key` unique constraint.
   - Quick "Mark Paid" action button for pending bills.
   - Payment history table with full customer, vehicle, and date references.
6. **User Interface & Experience:**
   - Clean single-page application feel with seamless tab switching.
   - Responsive layouts, modals, data tables, and badges.
   - Non-blocking floating toast notifications for instant feedback.

---

## 🛠️ Project Structure

```
vehical-rental/
├── backend/
│   ├── routes/
│   │   ├── dashboard.js      # /api/dashboard routes
│   │   ├── vehicles.js       # /api/vehicles routes
│   │   ├── customers.js      # /api/customers routes
│   │   ├── bookings.js       # /api/bookings routes
│   │   └── payments.js       # /api/payments routes
│   ├── .env                  # Database and server environment variables
│   ├── db.js                 # PostgreSQL pg.Pool configuration
│   ├── server.js             # Express application & static file server
│   ├── test_api.js           # Automated end-to-end API test suite
│   └── package.json          # Node.js dependencies and scripts
├── database/
│   └── schema.sql            # Complete PostgreSQL database dump
├── frontend/
│   ├── index.html            # Single page UI with modals and sections
│   ├── style.css             # Modern design system & responsive styling
│   └── script.js             # Vanilla JS app logic & fetch API client
└── README.md                 # Project documentation
```

---

## ⚙️ How to Setup and Run

### 1. Database Configuration
Ensure PostgreSQL is running on your machine and create the database:
```sql
CREATE DATABASE vehical_rental_db;
```
If not already imported in pgAdmin, import the schema:
```bash
psql -U postgres -d vehical_rental_db -f database/schema.sql
```

### 2. Configure Environment Variables
Inside `backend/.env`:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vehical_rental_db
DB_USER=postgres
DB_PASSWORD=your_new_secure_password
```

### 3. Install Dependencies & Start the Server
Open a terminal in the project directory:
```bash
cd backend
npm install
npm start
```

The Express server will start:
```
Server running successfully on port 3000
Access the application at http://localhost:3000
```

### 4. Open the Web Application
Open your web browser and navigate to:
```
http://localhost:3000
```

### 5. Run the Automated API Test Suite
To verify all database connections and endpoints:
```bash
cd backend
npm test
```

---

## 📡 REST API Endpoints Reference

### Dashboard (`/api/dashboard`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/dashboard/stats` | Returns total vehicles, available count, active rentals, total customers, and total revenue |
| `GET` | `/api/dashboard/recent-activity` | Returns the 5 most recent bookings and category breakdown counts |

### Vehicles (`/api/vehicles`)
| Method | Endpoint | Query / Body Params | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/vehicles` | `?category_id=&status=&search=` | List vehicles with joined category and branch details |
| `GET` | `/api/vehicles/meta/lookup` | None | Get category and branch lists for dropdowns |
| `GET` | `/api/vehicles/:id` | Route param `:id` | Get details of a single vehicle |
| `POST` | `/api/vehicles` | `{ reg_no, model, daily_rate, status, category_id, branch_id, ... }` | Add a new vehicle |
| `PUT` | `/api/vehicles/:id` | `{ reg_no, model, daily_rate, status, category_id, branch_id, ... }` | Update an existing vehicle |
| `DELETE`| `/api/vehicles/:id`| Route param `:id` | Delete a vehicle (if no booking references exist) |

### Customers (`/api/customers`)
| Method | Endpoint | Query / Body Params | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/customers` | `?search=` | List all customers (role='customer') |
| `GET` | `/api/customers/:id` | Route param `:id` | Get single customer details |
| `POST` | `/api/customers` | `{ name, email, phone, license_no, address }` | Register a new customer |
| `PUT` | `/api/customers/:id` | `{ name, email, phone, license_no, address }` | Update customer details |
| `DELETE`| `/api/customers/:id`| Route param `:id` | Delete customer (if no booking history exists) |

### Bookings / Rentals (`/api/bookings`)
| Method | Endpoint | Query / Body Params | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/bookings` | `?status=` | List all bookings with customer, vehicle, and payment details |
| `GET` | `/api/bookings/:id` | Route param `:id` | Get single booking details |
| `POST` | `/api/bookings` | `{ user_id, vehicle_id, start_date, end_date }` | Create booking, calculate cost, and mark vehicle unavailable |
| `POST` | `/api/bookings/:id/return` | Route param `:id` | Return vehicle: marks booking Completed and restores vehicle to Available |
| `POST` | `/api/bookings/:id/cancel` | Route param `:id` | Cancel booking and release vehicle back to Available |

### Payments (`/api/payments`)
| Method | Endpoint | Query / Body Params | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/payments` | `?status=` | View payment transaction history |
| `GET` | `/api/payments/pending-bookings` | None | List bookings requiring payment |
| `POST` | `/api/payments` | `{ booking_id, amount, payment_method, status }` | Record or update payment (handles unique constraint) |
| `PUT` | `/api/payments/:id` | `{ status, payment_method, amount }` | Update payment status (e.g., mark as Paid) |

