# Camera Data Management

This directory contains scripts for managing traffic camera data.

## Current Data Status

**Last Updated:** April 2026  
**Total Cameras:** 70
- Oakland: 18 speed cameras
- San Francisco: 33 speed cameras  
- San Francisco: 19 red light cameras

## Data Sources

Camera locations are compiled from official city sources:
- **Oakland:** [Speed Safety Cameras Pilot Program](https://www.oaklandca.gov/Public-Safety-Streets/Traffic-Safety/Speed-Safety-Cameras-Pilot-Program)
- **San Francisco Speed:** [SFMTA Speed Cameras](https://www.sfmta.com/speedcameras)
- **San Francisco Red Light:** [SFMTA Red Light Cameras](https://www.sfmta.com/tl/node/7951)

## Coordinate Accuracy

Coordinates were obtained through:
1. **Automated geocoding** (15 cameras) - Using Nominatim/OpenStreetMap
2. **Transit stop data** (5 cameras) - From SF Bay Transit API
3. **Manual verification** (44 cameras) - Cross-referenced with mapping services

All coordinates are accurate to within 1-2 blocks of the actual camera location.

## Scripts

### `update_cameras.py`
Simple script that outputs the current verified camera data to `api/cameras.json`.

**Usage:**
```bash
python3 scripts/update_cameras.py
```

**What it does:**
- Loads verified camera data (hardcoded in the script)
- Writes to `api/cameras.json`
- No external dependencies or API calls

### `geocode_cameras.py`
Experimental geocoding script (not currently used in production).

### `monitor_cameras.py`
**Option 3 Enhanced** - Automated camera monitoring with Playwright browser automation.

**Usage:**
```bash
pip3 install playwright
playwright install chromium
python3 scripts/monitor_cameras.py
```

**What it does:**
- Uses Playwright (real browser) to scrape Oakland and SF official websites monthly
- Extracts camera addresses from each website using reliable selectors
- Compares both count AND addresses to `api/cameras.json`
- Uses fuzzy matching to handle minor address variations
- Detects:
  - New cameras (with addresses)
  - Removed cameras (with addresses)
  - Relocated cameras (address changed)
  - Count changes
- Creates detailed GitHub issue if any changes detected

**Why Playwright?**
- ✅ Real browser automation - handles JavaScript, modern websites
- ✅ No 404 errors or bot blocking
- ✅ Reliable extraction using CSS selectors
- ✅ Works in GitHub Actions (headless mode)

**When changes are detected:**
- GitHub issue is automatically created with:
  - List of new camera addresses
  - List of removed camera addresses
  - Count comparison (website vs current data)
  - Instructions for manual update
- You manually:
  1. Verify changes on official websites
  2. Get coordinates for new cameras (Google Maps, OpenStreetMap)
  3. Update `scripts/update_cameras.py`
  4. Run `python3 scripts/update_cameras.py`
  5. Commit and push changes

### `auto_update_cameras.py`
**Automated quarterly update script** - Scrapes, geocodes, and creates PRs automatically.

**Usage:**
```bash
pip3 install playwright requests
playwright install chromium
python3 scripts/auto_update_cameras.py
```

**What it does:**
- Scrapes Oakland and SF websites for camera addresses
- Detects new and removed cameras
- **Automatically geocodes** new camera addresses using Nominatim
- Updates `api/cameras.json` with new cameras
- Creates PR description with:
  - List of changes
  - Geocoded coordinates (with accuracy warnings)
  - Google Maps verification links
- Used by GitHub Actions for quarterly automated updates

**Note:** This script is primarily run by GitHub Actions. Manual use is for testing only.

## Updating Camera Data

### Automated Updates (Recommended)

The GitHub Actions workflow runs quarterly and handles updates automatically:

1. **Workflow runs** (Jan 1, Apr 1, Jul 1, Oct 1)
2. **Scrapes websites** for camera changes
3. **Geocodes new cameras** automatically
4. **Creates Pull Request** if changes detected
5. **You review PR** (5-10 minutes):
   - Click Google Maps links to verify coordinates
   - Check accuracy (should be within 1-2 blocks)
   - Merge if good, or edit coordinates if needed

### Manual Updates

When you need to update cameras manually:

1. **Check official websites** for new camera announcements
2. **Edit `update_cameras.py`** - Update the `get_verified_camera_data()` function
3. **Add new camera entries** with coordinates:
   ```python
   {"id": "oak-019", "latitude": 37.XXXX, "longitude": -122.XXXX, 
    "city": "Oakland", "camera_type": "speed", "address": "Street Name (X-Y)"}
   ```
4. **Get coordinates** using one of these methods:
   - Google Maps: Right-click location → "What's here?"
   - OpenStreetMap: Click location, see coordinates in URL
   - Transit stops: Search [SF Bay Transit](https://sfbaytransit.org/)
5. **Run the script:**
   ```bash
   python3 scripts/update_cameras.py
   ```
6. **Commit and push:**
   ```bash
   git add api/cameras.json scripts/update_cameras.py
   git commit -m "Update camera locations"
   git push origin main
   ```

## GitHub Actions

The **quarterly** GitHub Actions workflow (`.github/workflows/update-cameras.yml`) runs automated camera updates on the 1st of January, April, July, and October at 2am UTC.

**What it does:**
1. Scrapes Oakland and SF websites for camera addresses
2. Compares to current `api/cameras.json` data
3. **If changes detected**:
   - Attempts to geocode new camera addresses using Nominatim (OpenStreetMap)
   - Updates `api/cameras.json` with new cameras
   - Creates a **Pull Request** with:
     - Updated camera data
     - Geocoded coordinates (with accuracy warning)
     - Google Maps links to verify each coordinate
     - List of removed cameras
4. **You review the PR** (5-10 minutes):
   - Click Google Maps links to verify coordinates
   - Check that coordinates are within 1-2 blocks
   - Merge if accurate, or manually edit coordinates if needed
5. **If no changes**: Workflow completes with no action

**Manual trigger:**
You can also run the workflow manually from the GitHub Actions tab to check for updates anytime.

**Frequency:**
- Quarterly checks (4 times per year)
- Cities typically announce new cameras in advance
- Plenty of time to catch new camera installations

## Data Format

Each camera entry in `cameras.json`:
```json
{
  "id": "oak-001",
  "latitude": 37.8319,
  "longitude": -122.2681,
  "city": "Oakland",
  "camera_type": "speed",
  "address": "Martin Luther King Jr Way (42nd-43rd St)"
}
```

**Fields:**
- `id`: Unique identifier (oak-XXX, sf-XXX, sf-rl-XXX)
- `latitude`: Decimal degrees, 4 decimal places
- `longitude`: Decimal degrees, 4 decimal places  
- `city`: "Oakland" or "San Francisco"
- `camera_type`: "speed" or "red_light"
- `address`: Human-readable location description

## Known Issues

- Automated geocoding may be off by 1-2 blocks (always verify in PR)
- Nominatim geocoding works best for street addresses, less reliable for intersections
- GitHub Actions requires manual PR review before changes go live

## Future Improvements

- Integrate with official city open data APIs (if they become available)
- Add camera status tracking (active/inactive)
- Include speed limit information
- Add camera direction (NB/SB/EB/WB) for bidirectional locations
