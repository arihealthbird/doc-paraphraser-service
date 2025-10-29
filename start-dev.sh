#!/bin/bash

# Start backend and frontend in parallel
echo "🚀 Starting backend on port 3000..."
npm run dev &
BACKEND_PID=$!

echo "🎨 Starting frontend on port 3001..."
cd client && npm run dev &
FRONTEND_PID=$!

# Handle Ctrl+C
trap "echo '\n⏹️  Shutting down servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

# Wait for both processes
wait
