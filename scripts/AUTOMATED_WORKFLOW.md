# Automated Camera Update Workflow

## Overview

Every quarter (January, April, July, October), a GitHub Action automatically checks for camera changes and creates a Pull Request if any are detected.

## What Happens Automatically

### 1. Scraping (Automated)
- Scrapes Oakland, SF Speed, and SF Red Light camera websites
- Extracts all camera addresses from official city sources

### 2. Change Detection (Automated)
- Compares scraped addresses to current data in `scripts/update_cameras.py`
- Identifies:
  - **New cameras** (addresses that appear on websites but not in our data)
  - **Removed cameras** (addresses in our data but not on websites)
  - **Changed addresses** (fuzzy matching detects address modifications)

### 3. Coordinate Verification (Semi-Automated)
For each new camera, the script uses **basic geocoding** to get initial coordinates:

#### Automated: Initial Geocoding
- Uses Nominatim (OpenStreetMap) geocoding API (free, no API key needed)
- Provides rough coordinates (can be off by 1-2 blocks or ~100-500m)
- **All new cameras are marked as ⚠️ Needs Manual Verification**

#### Manual: Transit Stop Verification (Recommended)
After the PR is created, you should manually verify coordinates using:
- **SF Bay Transit API** (sfbaytransit.org) - professionally surveyed bus stop coordinates
- **Google Maps** - for visual confirmation and precise coordinates
- **Our verification script** - `scripts/verify_oakland_coordinates.py`

**Why manual verification?**
- Geocoding APIs are often inaccurate (that's why we had wrong coordinates initially!)
- Transit stops have professionally surveyed coordinates (accurate to ~10-50m)
- Manual verification ensures accuracy within 1-2 blocks
- Only happens quarterly, so manual effort is minimal

### 4. Source of Truth Update (Automated)
- Updates `scripts/update_cameras.py` (the source of truth file)
- Adds new cameras with their coordinates
- Removes cameras that are no longer on city websites
- **Does NOT directly modify `api/cameras.json`**

### 5. API Regeneration (Automated)
- Runs `python3 scripts/update_cameras.py` to regenerate `api/cameras.json`
- Ensures API file stays in sync with source of truth

### 6. Pull Request Creation (Automated)
- Creates a PR with all changes
- Includes detailed description with:
  - List of new cameras (with verification status)
  - List of removed cameras
  - Google Maps links for each new camera
  - Review checklist

## What YOU Need to Do

When a PR is created, you need to:

### 1. Review the PR
- Check the changes in `scripts/update_cameras.py`
- Verify the list of new/removed cameras makes sense

### 2. Verify Coordinates (Critical!)

**All new cameras need manual verification** because automated geocoding is often inaccurate.

#### Recommended Verification Process:

**Step 1: Use SF Bay Transit API (Most Accurate)**
1. Go to https://sfbaytransit.org
2. Search for the camera's street address
3. Find nearby bus stops (within 1-2 blocks)
4. Use the bus stop coordinates as reference
5. Transit stops have professionally surveyed coordinates (±10-50m accuracy)

**Step 2: Cross-Reference with Google Maps**
1. Click the Google Maps link in the PR description
2. Search for the exact intersection
3. Right-click on the location → "What's here?"
4. Compare coordinates with transit stop coordinates
5. If they match (within ~100m), you're good!

**Step 3: Update Coordinates if Needed**
If the automated coordinates are wrong:
1. Use the transit stop coordinates OR Google Maps coordinates
2. Edit `scripts/update_cameras.py` (see "How to Fix Coordinates" below)
3. Regenerate `api/cameras.json`

**Example: Verifying "Broadway (26th-27th St)"**
1. Search sfbaytransit.org for "Broadway 27th Oakland"
2. Find stop: "Broadway & 27th St (Stop ID 12345)" at 37.8154, -122.2641
3. Check Google Maps: Broadway & 27th St shows 37.8155, -122.2640
4. Coordinates match! ✅ Use 37.8154, -122.2641

#### Quick Verification with Our Script
```bash
python3 scripts/verify_oakland_coordinates.py
```
This shows:
- Current coordinates for each camera
- Verified coordinates from transit stops (if available)
- Distance between current and verified coordinates
- Which cameras need fixing

### 3. Fix Inaccurate Coordinates (If Needed)

**Option A: Edit in PR (Quick)**
1. Edit `scripts/update_cameras.py` directly in the PR
2. Update the latitude/longitude for the incorrect camera
3. Commit the change to the PR branch
4. GitHub Actions will automatically regenerate `api/cameras.json`

**Option B: Edit Locally (Recommended)**
1. Pull the PR branch locally
2. Edit `scripts/update_cameras.py`
3. Run `python3 scripts/update_cameras.py` to regenerate API
4. Commit both files
5. Push to the PR branch

**How to find correct coordinates:**

**Method 1: SF Bay Transit (Recommended for Oakland)**
1. Go to https://sfbaytransit.org
2. Search for the camera address (e.g., "Broadway 27th Oakland")
3. Find the nearest bus stop (within 1-2 blocks)
4. Copy the coordinates from the stop details
5. These are professionally surveyed (±10-50m accuracy)

**Method 2: Google Maps**
1. Search for the exact intersection in Google Maps
2. Right-click on the location → "What's here?"
3. Copy the coordinates (format: 37.1234, -122.5678)
4. These are usually accurate to ±10-100m

**Method 3: Use Both (Best Practice)**
1. Get coordinates from SF Bay Transit stop
2. Verify with Google Maps
3. If they're within ~100m of each other, use the transit stop coordinates
4. If they differ significantly, investigate further

**Update the source file:**
1. Edit `scripts/update_cameras.py`
2. Find the camera entry (e.g., `{"id": "oak-019", ...}`)
3. Update `"latitude"` and `"longitude"` values
4. Run `python3 scripts/update_cameras.py` to regenerate API
5. Commit both files

**Or use our verification script:**
```bash
python3 scripts/verify_oakland_coordinates.py
```
This will show which cameras are verified and which need fixing.

### 4. Test Locally (Optional but Recommended)
```bash
# Open index.html in a browser
# Check that new cameras appear in correct locations
# Verify removed cameras are gone
```

### 5. Merge the PR
Once coordinates are verified and accurate, merge the PR!

## File Structure

```
scripts/
├── update_cameras.py              # SOURCE OF TRUTH - manually curated coordinates
├── auto_update_cameras_v2.py      # Automated quarterly update script
├── verify_oakland_coordinates.py  # Coordinate verification tool
└── AUTOMATED_WORKFLOW.md          # This file

api/
└── cameras.json                   # GENERATED FILE - do not edit directly!
```

## Key Principles

### 1. Source of Truth
- `scripts/update_cameras.py` is the **source of truth**
- All coordinate fixes should be made here
- `api/cameras.json` is **generated** from this file

### 2. Coordinate Accuracy
- **Manual verification (SF Bay Transit + Google Maps)**: ~10-50m accuracy (best)
- **Transit stop coordinates**: ~10-50m accuracy (excellent)
- **Geocoded coordinates (automated)**: ~100-500m accuracy (needs verification)
- **Google Maps only**: ~10-100m accuracy (good)

### 3. Preservation of Manual Fixes
- The automated script **never modifies existing camera coordinates**
- It only adds new cameras or removes deleted ones
- Your manual coordinate fixes are preserved

## Troubleshooting

### "The automated script changed my manual coordinates!"
This shouldn't happen. The script only:
- Adds new cameras
- Removes cameras that disappeared from city websites
- Never modifies existing camera coordinates

If this happens, it's a bug - please report it!

### "A new camera's coordinates are way off"
This is expected! Automated geocoding is often inaccurate.

**Fix it:**
1. Use SF Bay Transit (sfbaytransit.org) to find nearby bus stops
2. Cross-reference with Google Maps
3. Edit `scripts/update_cameras.py` with correct coordinates
4. Run `python3 scripts/update_cameras.py`
5. Commit both files

**See "Verify Coordinates" section above for detailed steps.**

### "The PR says 'No changes detected' but I see changes on the website"
Possible causes:
1. Address format changed slightly (fuzzy matching might have matched it)
2. Scraping failed for that city's website
3. The change is too minor (e.g., punctuation)

Check the workflow logs in GitHub Actions for details.

### "How do I manually trigger the workflow?"
1. Go to GitHub Actions tab
2. Select "Automated Camera Update" workflow
3. Click "Run workflow"
4. Select branch (usually `main`)
5. Click "Run workflow"

## Future Improvements

Potential enhancements to consider:

1. **Automated Geocoding Validation**
   - Compare automated geocoding results against multiple sources
   - Flag cameras with high coordinate uncertainty
   - Provide confidence scores for each coordinate

2. **SF Bay Transit API Integration**
   - Automate transit stop lookups for new cameras
   - Still require manual review, but provide better starting coordinates
   - Note: Would need to handle API rate limits and availability

3. **Address Change Detection**
   - Detect when a camera's address changes (not just add/remove)
   - Automatically update addresses while preserving manually verified coordinates

4. **Coordinate Confidence Scoring**
   - Track verification method for each camera (transit, Google Maps, manual)
   - Display confidence levels in verification script
   - Prioritize re-verification for low-confidence cameras

5. **Automated Testing**
   - Run visual regression tests on camera map
   - Ensure new cameras don't overlap or appear in wrong locations
   - Validate that all cameras fall within expected city boundaries
