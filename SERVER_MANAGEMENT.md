# DMTools Server Management

This document describes how to manage and monitor the DMTools web server, including automatic restart functionality.

## Quick Start

### Using the Server Manager Script (Recommended)

The `server-manager.sh` script provides comprehensive server management with health monitoring and automatic restart capabilities.

#### Start the server with monitoring
```bash
./server-manager.sh monitor
```

This will:
- Start the server if not running
- Check server health every 60 seconds
- Automatically restart if the server becomes unresponsive
- Log all events to `server.log`

#### Basic Commands

```bash
# Start the server
./server-manager.sh start

# Stop the server
./server-manager.sh stop

# Restart the server
./server-manager.sh restart

# Check server status
./server-manager.sh status
```

### Using the Original Script

```bash
./start-server.sh
```

Note: This doesn't include auto-restart functionality.

## Server Manager Features

### Health Monitoring
- Checks server responsiveness every 60 seconds
- Allows up to 3 consecutive failures before restart
- Verifies both process status and HTTP connectivity

### Automatic Restart
- Detects when server becomes unresponsive
- Gracefully stops the old process
- Starts a new server instance
- Logs all restart events

### Configuration
Edit `server-manager.sh` to customize:
- `PORT` - Server port (default: 8080)
- `CHECK_INTERVAL` - Time between health checks in seconds (default: 60)
- `MAX_RETRIES` - Number of failed checks before restart (default: 3)

## Running as a System Service (Optional)

For automatic startup on boot and systemd integration:

### Install the service

```bash
# Copy the service file to systemd
sudo cp dmtools.service /etc/systemd/system/

# Edit the service file to set your username
sudo nano /etc/systemd/system/dmtools.service
# Replace %u with your actual username

# Reload systemd
sudo systemctl daemon-reload

# Enable the service to start on boot
sudo systemctl enable dmtools.service

# Start the service
sudo systemctl start dmtools.service
```

### Manage the systemd service

```bash
# Check service status
sudo systemctl status dmtools.service

# Stop the service
sudo systemctl stop dmtools.service

# Restart the service
sudo systemctl restart dmtools.service

# View logs
sudo journalctl -u dmtools.service -f
```

### Systemd Auto-Restart

The systemd service is configured to automatically restart:
- If the server crashes
- After 10 seconds delay
- Up to 5 times within 200 seconds

## Troubleshooting

### Server won't start

1. Check if port 8080 is already in use:
   ```bash
   sudo netstat -tlnp | grep 8080
   # or
   sudo ss -tlnp | grep 8080
   ```

2. Kill any conflicting processes:
   ```bash
   sudo pkill -f "python3 -m http.server 8080"
   ```

3. Try starting with the manager:
   ```bash
   ./server-manager.sh restart
   ```

### Server becomes unresponsive

If using `monitor` mode, the server will automatically restart. Otherwise:

```bash
./server-manager.sh restart
```

### Check logs

```bash
# View the log file
tail -f server.log

# Or if using systemd
sudo journalctl -u dmtools.service -f
```

### Manual restart

```bash
# Find and kill the server process
ps aux | grep "python3 -m http.server 8080"
kill [PID]

# Start fresh
./server-manager.sh start
```

## Running in Background

### Using screen (recommended for SSH sessions)

```bash
# Start a new screen session
screen -S dmtools

# Run the monitor
./server-manager.sh monitor

# Detach from screen: Press Ctrl+A, then D

# Reattach later
screen -r dmtools

# List screens
screen -ls
```

### Using nohup

```bash
nohup ./server-manager.sh monitor &

# View output
tail -f server.log
```

### Using tmux

```bash
# Start a new tmux session
tmux new -s dmtools

# Run the monitor
./server-manager.sh monitor

# Detach: Press Ctrl+B, then D

# Reattach later
tmux attach -t dmtools
```

## Monitoring and Alerts

### Check server health manually

```bash
curl -I http://localhost:8080
```

Expected response:
```
HTTP/1.0 200 OK
```

### Monitor log in real-time

```bash
tail -f server.log
```

### Set up email alerts (advanced)

You can modify `server-manager.sh` to send email notifications on restart by adding a mail command in the `restart_server` function:

```bash
echo "DMTools server was restarted at $(date)" | mail -s "DMTools Server Restart" your@email.com
```

## Best Practices

1. **Use monitor mode** for production: `./server-manager.sh monitor`
2. **Run in screen/tmux** for SSH sessions
3. **Use systemd service** for servers that require auto-start on boot
4. **Check logs regularly** to identify recurring issues
5. **Set appropriate CHECK_INTERVAL** based on your needs (lower for critical use)

## Known Issues

### Python HTTP Server Limitations

The built-in Python HTTP server is designed for development and may become unresponsive under certain conditions:

- Heavy concurrent connections
- Large file transfers
- Long-running sessions

**Solutions:**
- Use the monitor mode for automatic recovery
- Consider upgrading to a production server (nginx, Apache) for heavy usage
- Restart periodically during low-usage periods

## Advanced: Production Server Setup

For production use with higher reliability, consider using nginx:

```bash
# Install nginx
sudo apt-get install nginx

# Configure nginx to serve the DMTools directory
# (Configuration example would go here)
```

Contact your system administrator for assistance with production deployments.
