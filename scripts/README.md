# Camera Data Scraper

This directory contains scripts for automatically updating traffic camera data.

## Overview

The `update_cameras.py` script scrapes official city websites to get the latest camera locations:
- **Oakland**: Speed cameras from [oaklandca.gov](https://www.oaklandca.gov/Public-Safety-Streets/Traffic-Safety/Speed-Safety-Cameras-Pilot-Program)
- **San Francisco**: Speed and red light cameras from [sfmta.com](https://www.sfmta.com/speedcameras)

## Automated Updates

The script runs automatically via GitHub Actions:
- **Schedule**: 1st of every month at 2am UTC
- **Manual trigger**: Can be run manually from the Actions tab
- **Auto-commit**: If changes are detected, automatically commits and pushes to the repo

## Manual Usage

To run the scraper manually:

```bash
# From the project root
python3 scripts/update_cameras.py
```

This will:
1. Scrape camera locations from official websites
2. Geocode addresses to latitude/longitude using OpenStreetMap Nominatim
3. Update `api/cameras.json` with the latest data
4. Print a summary of changes

## Requirements

- Python 3.7+
- No external dependencies (uses only standard library)
- Internet connection for scraping and geocoding

## Geocoding

The script uses [Nominatim](https://nominatim.openstreetmap.org/) (OpenStreetMap's geocoding service):
- Free and open source
- No API key required
- Rate limited to 1 request per second (script respects this)

## Error Handling

- If a website is unreachable, the script continues with other sources
- If geocoding fails for an address, that camera is skipped with a warning
- The script exits with code 1 if no cameras were successfully scraped

## Monitoring

Check the GitHub Actions tab to see:
- When the script last ran
- Whether any changes were detected
- Any errors that occurred

## Testing

To test the scraper without committing:

```bash
# Run the scraper
python3 scripts/update_cameras.py

# Check what changed
git diff api/cameras.json
```
