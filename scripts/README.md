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

All 70 camera coordinates have been verified using a multi-source approach:

### Verification Methods (in order of accuracy):

1. **SF Bay Transit Stops** (18 Oakland cameras) - ±10-50m accuracy
   - Professional surveyed coordinates from bus stop locations
   - Most reliable method for Oakland cameras
   - Source: https://sfbaytransit.org

2. **Manual Google Maps Verification** (52 SF cameras) - ±10-100m accuracy
   - Cross-referenced with street view and satellite imagery
   - Verified intersection locations

3. **Automated Geocoding** (initial only) - ±100-500m accuracy
   - Used only for initial coordinate estimates
   - Always followed by manual verification

**Current Status:** All 70 cameras verified to within 1-2 blocks (±200m) of actual location.

### Verification Process for New Cameras

When new cameras are added (quarterly updates), follow this process:

1. **SF Bay Transit Lookup** (for Oakland cameras):
   - Search https://sfbaytransit.org for nearby bus stops
   - Use transit stop coordinates as reference
   - Example: "Broadway 27th Oakland" → Stop ID 12345 at 37.8154, -122.2641

2. **Google Maps Cross-Reference**:
   - Search for exact intersection
   - Right-click → "What's here?" to get coordinates
   - Compare with transit stop coordinates (should be within ~100m)

3. **Use Verification Script**:
   ```bash
   python3 scripts/verify_oakland_coordinates.py
   ```
   Shows distance between current and verified coordinates

4. **Update Source File**:
   - Edit `scripts/update_cameras.py` with verified coordinates
   - Run `python3 scripts/update_cameras.py` to regenerate API
   - Commit both files

See `scripts/AUTOMATED_WORKFLOW.md` for detailed verification instructions.

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

### `verify_oakland_coordinates.py`
Verification tool that compares current camera coordinates against known-good reference coordinates from SF Bay Transit stops.

**Usage:**
```bash
python3 scripts/verify_oakland_coordinates.py
```

**What it does:**
- Loads current camera data from `api/cameras.json`
- Compares against verified coordinates from SF Bay Transit stops
- Calculates distance between current and verified coordinates
- Flags cameras that are >200m off target
- Shows verification status for all Oakland cameras

**Output:**
```
oak-001: Martin Luther King Jr Way (42nd-43rd St)
  Current:  37.8315, -122.268
  Verified: 37.8313, -122.2679 (MLK Jr Way & 42nd St)
  Distance: 24m ✅ GOOD

Summary
Verified: 18/18 cameras
Issues found: 0
```

**When to use:**
- After updating camera coordinates
- When reviewing quarterly update PRs
- To check which cameras need verification

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
4. **Get coordinates** using this recommended process:
   
   **Step 1: SF Bay Transit (for Oakland cameras)**
   - Go to https://sfbaytransit.org
   - Search for the camera address (e.g., "Broadway 27th Oakland")
   - Find nearest bus stop (within 1-2 blocks)
   - Copy coordinates from stop details
   - Transit stops have professionally surveyed coordinates (±10-50m)
   
   **Step 2: Google Maps (for all cameras)**
   - Search for exact intersection in Google Maps
   - Right-click location → "What's here?"
   - Copy coordinates (format: 37.1234, -122.5678)
   
   **Step 3: Cross-Reference (best practice)**
   - If both methods available, compare coordinates
   - Should be within ~100m of each other
   - Use transit stop coordinates if available (more accurate)
   - Otherwise use Google Maps coordinates
   
   **Step 4: Verify**
   ```bash
   python3 scripts/verify_oakland_coordinates.py
   ```
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

- **Automated geocoding requires manual verification** - Initial coordinates from Nominatim can be off by 1-2 blocks
- **SF cameras lack transit stop verification** - Only Oakland cameras can use SF Bay Transit for verification
- **Intersection addresses are ambiguous** - "Broadway (26th-27th St)" could mean multiple exact locations
- **GitHub Actions requires manual PR review** - Coordinates must be verified before merging

## Future Improvements

- Integrate with official city open data APIs (if they become available)
- Add camera status tracking (active/inactive)
- Include speed limit information
- Add camera direction (NB/SB/EB/WB) for bidirectional locations
