#!/bin/bash
# Start DMTools Web Server

cd "$(dirname "$0")"

echo "========================================="
echo "DMTools - D&D Lighting & Sound Controller"
echo "========================================="
echo ""
echo "Starting web server..."
echo ""
echo "Access DMTools at:"
echo "  Local:   http://localhost:8080"
echo "  Network: http://$(hostname -I | awk '{print $1}'):8080"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""
echo "========================================="
echo ""

python3 -m http.server 8080
