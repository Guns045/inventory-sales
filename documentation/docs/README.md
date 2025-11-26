# Inventory Management System

A full-stack inventory management system built with Laravel (backend) and React.js (frontend).

## Prerequisites

- PHP 8.2 or higher
- Composer
- Node.js and npm
- MySQL or other compatible database

## Installation

### Backend (Laravel)

1. Navigate to the project root directory:
   ```bash
   cd C:\xampp\htdocs\jinan-inventory
   ```

2. Install PHP dependencies:
   ```bash
   composer install
   ```

3. Copy the environment file and set your configurations:
   ```bash
   cp .env.example .env
   ```

4. Generate application key:
   ```bash
   php artisan key:generate
   ```

5. Set up the database:
   - Update your database credentials in the `.env` file
   - Run migrations:
     ```bash
     php artisan migrate
     ```

6. (Optional) Seed the database with sample data:
   ```bash
   php artisan db:seed
   ```

### Frontend (React.js)

1. Navigate to the frontend directory:
   ```bash
   cd C:\xampp\htdocs\jinan-inventory\frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Running the Application

### Backend Server

To run the Laravel backend server:

```bash
cd C:\xampp\htdocs\jinan-inventory
php artisan serve --host=localhost --port=8000
```

The backend API will be available at: `http://localhost:8000`

### Frontend Server

To run the React frontend server:

```bash
cd C:\xampp\htdocs\jinan-inventory\frontend
npm start
```

The frontend will be available at: `http://localhost:3000`

## System Architecture

- Backend: Laravel 12 REST API
- Frontend: React.js with Context API for state management
- Communication: HTTP requests with Axios
- Authentication: Laravel Sanctum tokens
- Database: MySQL (configurable)

## API Endpoints

The API is accessible at `http://localhost:8000/api` with the following main endpoints:

- `POST /api/login` - User authentication
- `POST /api/logout` - User logout
- `GET /api/users` - Get all users (requires authentication)
- `GET /api/products` - Get all products (requires authentication)
- Other resource endpoints follow REST conventions

## Important Notes

1. Make sure both servers are running simultaneously
2. The frontend is configured to proxy requests to the backend at `http://localhost:8000`
3. CORS is configured to allow requests from `http://localhost:3000`
4. Authentication tokens are stored in browser's localStorage

## Troubleshooting

### Common Issues

- **CORS Error**: Make sure both servers are running and CORS configuration is correct
- **Database Connection**: Verify your database credentials in `.env`
- **Missing Dependencies**: Ensure all PHP and Node dependencies are installed

### Running as Administrator

On Windows systems, you might need to run Command Prompt as Administrator to avoid permission issues.