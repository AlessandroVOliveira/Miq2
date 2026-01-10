#!/bin/bash
# Entrypoint script for Miq2 backend
# Runs database seed then starts the application

echo "Starting Miq2 Backend..."

# Wait for database to be ready
echo "Waiting for database..."
sleep 3

# Run database seed (idempotent - safe to run multiple times)
echo "Running database seed..."
python seed.py

# Start the application
echo "Starting uvicorn server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
