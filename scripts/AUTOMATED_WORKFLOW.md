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

### 3. Coordinate Verification (Automated)
For each new camera, the script attempts to find accurate coordinates using a **two-tier approach**:

#### Tier 1: Transit Stop Verification (Most Accurate)
- Searches SF Bay Transit (sfbaytransit.org) for bus stops near the camera address
- Transit stops have professionally surveyed coordinates (accurate to ~10-50m)
- **Cameras verified this way are marked as ✅ Verified**

#### Tier 2: Geocoding Fallback (Less Accurate)
- If no transit stop found, uses Nominatim (OpenStreetMap) geocoding
- Geocoding can be off by 1-2 blocks (~100-500m)
- **Cameras geocoded this way are marked as ⚠️ Needs Verification**

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

#### For ✅ Verified Cameras (from Transit Stops)
- These are usually accurate (within 1 block)
- Quick spot-check recommended but not critical

#### For ⚠️ Needs Verification Cameras (from Geocoding)
- **These MUST be manually verified**
- Click the Google Maps link in the PR description
- Check if the marker is at the correct intersection
- If incorrect, see "How to Fix Coordinates" below

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
1. Use Google Maps to find the exact intersection
2. Right-click on the location → "What's here?"
3. Copy the coordinates (format: 37.1234, -122.5678)
4. Update `scripts/update_cameras.py` with these coordinates

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
- Transit-verified coordinates: ~10-50m accuracy (excellent)
- Geocoded coordinates: ~100-500m accuracy (needs verification)
- Manual verification: ~1-10m accuracy (best)

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
1. Check if it's marked as ⚠️ Needs Verification
2. Use Google Maps to find correct coordinates
3. Edit `scripts/update_cameras.py`
4. Run `python3 scripts/update_cameras.py`
5. Commit both files

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

1. **Better Transit Stop Matching**
   - Integrate SF Bay Transit API directly
   - Automated coordinate verification for all new cameras

2. **Address Change Detection**
   - Detect when a camera's address changes (not just add/remove)
   - Automatically update addresses while preserving coordinates

3. **Coordinate Confidence Scoring**
   - Assign confidence scores to geocoded coordinates
   - Prioritize manual verification for low-confidence cameras

4. **Automated Testing**
   - Run visual regression tests on camera map
   - Ensure new cameras don't overlap or appear in wrong locations
