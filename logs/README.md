# Logs Directory

This directory contains application logs:

- `selenium-box.log` - Main application logs
- `browser-pool.log` - Browser pool service logs
- `performance.log` - Performance and metrics logs
- `error.log` - Error logs

## Log Rotation

Logs are automatically rotated based on configuration:
- `LOG_MAX_SIZE=100m` - Maximum file size (100MB)
- `LOG_MAX_FILES=10` - Maximum number of log files

## Log Levels

- `error` - Error messages only
- `warn` - Warnings and errors
- `info` - General information (default)
- `debug` - Detailed debugging information

## Viewing Logs

```bash
# View main application logs
tail -f logs/selenium-box.log

# View browser pool logs
tail -f logs/browser-pool.log

# View all logs
tail -f logs/*.log

# Search logs
grep "ERROR" logs/selenium-box.log
```