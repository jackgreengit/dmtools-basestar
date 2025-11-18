# DMTools Quick Start Guide

## Starting the Server

### Option 1: With Auto-Restart (Recommended)
```bash
./server-manager.sh monitor
```
Server will automatically restart if it becomes unresponsive.

### Option 2: Simple Start
```bash
./server-manager.sh start
```

### Option 3: Original Script
```bash
./start-server.sh
```

## Managing the Server

```bash
# Check if server is running and healthy
./server-manager.sh status

# Restart the server
./server-manager.sh restart

# Stop the server
./server-manager.sh stop
```

## Accessing DMTools

Once running, open your browser to:
- **Local**: http://localhost:8080
- **Network**: http://192.168.0.36:8080

## Running in Background

### Using screen (recommended for SSH)
```bash
screen -S dmtools
./server-manager.sh monitor
# Press Ctrl+A then D to detach

# Reconnect later with:
screen -r dmtools
```

### Using nohup
```bash
nohup ./server-manager.sh monitor &
tail -f server.log
```

## Troubleshooting

### Server won't start
```bash
# Kill any existing server
sudo pkill -f "python3 -m http.server 8080"

# Restart
./server-manager.sh restart
```

### Check health
```bash
./server-manager.sh status
curl -I http://localhost:8080
```

### View logs
```bash
tail -f server.log
```

## Configuration

1. Edit your settings: `nano config.json`
2. Configure WLED IP and Home Assistant settings
3. Restart server: `./server-manager.sh restart`

## More Information

- Full server management guide: [SERVER_MANAGEMENT.md](SERVER_MANAGEMENT.md)
- Complete documentation: [README.md](README.md)
- Testing guide: [TESTING.md](TESTING.md)
