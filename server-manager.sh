#!/bin/bash
# DMTools Server Manager with Auto-Restart
# This script monitors and manages the DMTools web server

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=8080
PIDFILE="$SCRIPT_DIR/.server.pid"
LOGFILE="$SCRIPT_DIR/server.log"
CHECK_INTERVAL=60  # Check every 60 seconds
MAX_RETRIES=3      # Max consecutive failures before restart

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOGFILE"
}

# Function to start the server
start_server() {
    cd "$SCRIPT_DIR"

    # Kill any existing server on this port
    pkill -f "python3 -m http.server $PORT" 2>/dev/null
    sleep 2

    log "Starting DMTools web server on port $PORT..."

    # Start server in background
    nohup python3 -m http.server $PORT >> "$LOGFILE" 2>&1 &
    SERVER_PID=$!
    echo $SERVER_PID > "$PIDFILE"

    sleep 2

    # Verify server started
    if check_server_health; then
        log "${GREEN}Server started successfully (PID: $SERVER_PID)${NC}"
        echo -e "${GREEN}=========================================${NC}"
        echo -e "${GREEN}DMTools Server Started${NC}"
        echo -e "${GREEN}=========================================${NC}"
        echo ""
        echo "Access DMTools at:"
        echo "  Local:   http://localhost:$PORT"
        echo "  Network: http://$(hostname -I | awk '{print $1}'):$PORT"
        echo ""
        echo "Server PID: $SERVER_PID"
        echo "Log file:   $LOGFILE"
        echo ""
        return 0
    else
        log "${RED}Failed to start server${NC}"
        return 1
    fi
}

# Function to stop the server
stop_server() {
    log "Stopping DMTools web server..."

    if [ -f "$PIDFILE" ]; then
        PID=$(cat "$PIDFILE")
        if ps -p $PID > /dev/null 2>&1; then
            kill $PID
            sleep 2

            # Force kill if still running
            if ps -p $PID > /dev/null 2>&1; then
                kill -9 $PID
            fi
        fi
        rm -f "$PIDFILE"
    fi

    # Also kill any python http.server on our port
    pkill -f "python3 -m http.server $PORT" 2>/dev/null

    log "${YELLOW}Server stopped${NC}"
}

# Function to check server health
check_server_health() {
    # Check if process is running
    if [ -f "$PIDFILE" ]; then
        PID=$(cat "$PIDFILE")
        if ! ps -p $PID > /dev/null 2>&1; then
            return 1
        fi
    else
        return 1
    fi

    # Try to connect to the server
    if command -v curl > /dev/null 2>&1; then
        curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT" > /dev/null 2>&1
        return $?
    elif command -v wget > /dev/null 2>&1; then
        wget -q --spider "http://localhost:$PORT" 2>&1
        return $?
    else
        # Fallback: just check if port is listening
        netstat -tln 2>/dev/null | grep -q ":$PORT " || ss -tln 2>/dev/null | grep -q ":$PORT "
        return $?
    fi
}

# Function to restart the server
restart_server() {
    log "${YELLOW}Restarting server...${NC}"
    stop_server
    sleep 2
    start_server
}

# Function to monitor the server
monitor_server() {
    log "Starting DMTools server monitor (checking every ${CHECK_INTERVAL}s)"
    echo -e "${GREEN}Press Ctrl+C to stop monitoring${NC}"

    FAILURE_COUNT=0

    while true; do
        sleep $CHECK_INTERVAL

        if check_server_health; then
            FAILURE_COUNT=0
            log "Server health check: OK"
        else
            FAILURE_COUNT=$((FAILURE_COUNT + 1))
            log "${RED}Server health check FAILED (attempt $FAILURE_COUNT/$MAX_RETRIES)${NC}"

            if [ $FAILURE_COUNT -ge $MAX_RETRIES ]; then
                log "${RED}Server appears unresponsive. Attempting restart...${NC}"
                restart_server
                FAILURE_COUNT=0
            fi
        fi
    done
}

# Function to show server status
status_server() {
    echo "DMTools Server Status"
    echo "====================="

    if [ -f "$PIDFILE" ]; then
        PID=$(cat "$PIDFILE")
        if ps -p $PID > /dev/null 2>&1; then
            echo -e "Status: ${GREEN}RUNNING${NC}"
            echo "PID: $PID"

            if check_server_health; then
                echo -e "Health: ${GREEN}OK${NC}"
            else
                echo -e "Health: ${RED}DEGRADED${NC}"
            fi
        else
            echo -e "Status: ${RED}STOPPED${NC} (stale PID file)"
            rm -f "$PIDFILE"
        fi
    else
        echo -e "Status: ${RED}STOPPED${NC}"
    fi

    echo ""
    echo "Port: $PORT"
    echo "Log: $LOGFILE"
}

# Main command handler
case "$1" in
    start)
        start_server
        ;;
    stop)
        stop_server
        ;;
    restart)
        restart_server
        ;;
    status)
        status_server
        ;;
    monitor)
        # Start server if not running
        if ! check_server_health; then
            start_server
        fi
        # Start monitoring
        monitor_server
        ;;
    *)
        echo "DMTools Server Manager"
        echo "======================"
        echo ""
        echo "Usage: $0 {start|stop|restart|status|monitor}"
        echo ""
        echo "Commands:"
        echo "  start    - Start the web server"
        echo "  stop     - Stop the web server"
        echo "  restart  - Restart the web server"
        echo "  status   - Show server status"
        echo "  monitor  - Start server and monitor with auto-restart"
        echo ""
        exit 1
        ;;
esac

exit 0
