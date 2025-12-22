# Downloads Directory

This directory is used for storing browser downloads:

- Screenshot files
- Downloaded files
- Video recordings
- Test artifacts

## Structure

```
downloads/
├── screenshots/     # Browser screenshots
├── files/          # Downloaded files
├── videos/          # Screen recordings
└── temp/           # Temporary files
```

## Configuration

Download location is configured via environment variables:
- `DOWNLOAD_PATH=./downloads` - Base download directory
- `SCREENSHOT_PATH=./downloads/screenshots` - Screenshot location
- `VIDEO_PATH=./downloads/videos` - Video recording location

## Cleanup

Temporary files are automatically cleaned up based on:
- `TEMP_FILE_MAX_AGE=3600000` - 1 hour
- `CLEANUP_INTERVAL=300000` - 5 minutes