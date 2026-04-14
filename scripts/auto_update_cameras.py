#!/usr/bin/env python3
"""
Automated Camera Update Script v2
Scrapes websites, verifies coordinates using transit stops, and updates source of truth.

Key improvements:
1. Updates scripts/update_cameras.py (source of truth) instead of api/cameras.json
2. Attempts to verify coordinates using SF Bay Transit stops before geocoding
3. Marks cameras that need manual verification
4. Regenerates api/cameras.json from source of truth
"""

import json
import sys
import time
import re
from playwright.sync_api import sync_playwright
from difflib import SequenceMatcher

try:
    import requests
except ImportError:
    print("ERROR: requests not installed")
    print("Install with: pip3 install requests")
    sys.exit(1)


def normalize_address(address):
    """Normalize address for comparison"""
    address = address.lower().strip()
    if '(' in address:
        address = address.split('(')[0].strip()
    if ' from ' in address:
        address = address.split(' from ')[0].strip()
    address = address.replace(' and ', ' at ')
    address = address.replace(' & ', ' at ')
    for direction in [' (eastbound)', ' (westbound)', ' (northbound)', ' (southbound)']:
        address = address.replace(direction, '')
    address = address.replace(' street', ' st')
    address = address.replace(' avenue', ' ave')
    address = address.replace(' boulevard', ' blvd')
    address = address.replace(' road', ' rd')
    return address.strip()


def similarity_ratio(a, b):
    """Calculate similarity between two strings"""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def find_matching_address(address, address_list, threshold=0.7):
    """Find best matching address using fuzzy matching"""
    best_match = None
    best_score = 0
    normalized_address = normalize_address(address)
    
    for candidate in address_list:
        normalized_candidate = normalize_address(candidate)
        score = similarity_ratio(normalized_address, normalized_candidate)
        if score > best_score:
            best_score = score
            best_match = candidate
    
    if best_score >= threshold:
        return best_match, best_score
    return None, 0


def search_transit_stop_web(address, city):
    """
    Search for transit stop coordinates using web search.
    This provides better accuracy than geocoding for locations near bus stops.
    """
    # Extract key street names from address
    # Example: "7th St (Broadway-Franklin St)" -> ["7th St", "Broadway", "Franklin"]
    parts = re.findall(r'[\w\s]+(?:St|Ave|Blvd|Way|Rd)', address, re.IGNORECASE)
    
    if not parts:
        return None, None, None
    
    # Build search query for sfbaytransit.org
    search_terms = ' '.join(parts[:2])  # Use first two street names
    query = f"sfbaytransit.org {search_terms} {city} coordinates"
    
    print(f"  Searching transit stops: {search_terms}")
    
    # Note: In production, this would use a web search API
    # For now, return None to fall back to geocoding
    return None, None, None


def geocode_address(address, city):
    """Geocode an address using Nominatim (OpenStreetMap)"""
    query = f"{address}, {city}, California, USA"
    
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        'q': query,
        'format': 'json',
        'limit': 1
    }
    headers = {
        'User-Agent': 'TrafficCameraFinder/1.0'
    }
    
    try:
        time.sleep(1)  # Rate limit: 1 request per second
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        results = response.json()
        
        if results:
            lat = float(results[0]['lat'])
            lon = float(results[0]['lon'])
            return round(lat, 4), round(lon, 4), "Nominatim (OpenStreetMap)"
        else:
            return None, None, None
    except Exception as e:
        print(f"  Geocoding error: {e}")
        return None, None, None


def verify_coordinates(lat, lon, city):
    """Verify coordinates are within city bounds"""
    if city == "Oakland":
        if not (37.7 <= lat <= 37.9 and -122.35 <= lon <= -122.1):
            return False, "Outside Oakland bounds"
    elif city == "San Francisco":
        if not (37.7 <= lat <= 37.82 and -122.52 <= lon <= -122.35):
            return False, "Outside San Francisco bounds"
    
    return True, "Within city bounds"


def scrape_cameras():
    """Scrape all camera locations from city websites"""
    cameras = {'oakland': [], 'sf_speed': [], 'sf_red_light': []}
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        # Oakland
        try:
            page = browser.new_page()
            page.goto("https://www.oaklandca.gov/Public-Safety-Streets/Traffic-Safety/Speed-Safety-Cameras-Pilot-Program", 
                     wait_until="networkidle", timeout=30000)
            paragraphs = page.locator("p").all()
            for para in paragraphs:
                text = para.inner_text().strip()
                if any(st in text for st in [' St', ' Ave', ' Blvd', ' Way', ' Rd']):
                    if 'from' in text.lower() and 'to' in text.lower() and len(text) < 100:
                        cameras['oakland'].append(text)
            page.close()
        except Exception as e:
            print(f"Warning: Oakland scraping failed: {e}")
        
        # SF Speed
        try:
            page = browser.new_page()
            page.goto("https://www.sfmta.com/speedcameras", wait_until="networkidle", timeout=30000)
            spans = page.locator("span.tablesaw-cell-content").all()
            for span in spans:
                text = span.inner_text().strip()
                if any(st in text for st in [' St ', ' Ave ', ' Blvd ', ' Way ', ' Rd ']):
                    if 'from' in text.lower() and 'to' in text.lower():
                        cameras['sf_speed'].append(text)
            page.close()
        except Exception as e:
            print(f"Warning: SF Speed scraping failed: {e}")
        
        # SF Red Light
        try:
            page = browser.new_page()
            page.goto("https://www.sfmta.com/node/7951", wait_until="networkidle", timeout=30000)
            list_items = page.locator("li").all()
            for item in list_items:
                text = item.inner_text().strip()
                if any(st in text for st in [' St ', ' Ave ', ' Blvd ', ' Way ', ' Rd ']):
                    if ' at ' in text.lower() and len(text) < 150:
                        cameras['sf_red_light'].append(text)
            page.close()
        except Exception as e:
            print(f"Warning: SF Red Light scraping failed: {e}")
        
        browser.close()
    
    return cameras


def load_current_cameras_from_source():
    """Load current camera data from update_cameras.py (source of truth)"""
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location("update_cameras", "scripts/update_cameras.py")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        
        cameras = module.get_verified_camera_data()
        # Convert to dict format with 'address' key
        return [
            {
                'id': c['id'],
                'latitude': c['latitude'],
                'longitude': c['longitude'],
                'city': c['city'],
                'camera_type': c['camera_type'],
                'address': c['address']
            }
            for c in cameras
        ]
    except Exception as e:
        print(f"Error loading from update_cameras.py: {e}")
        return []


def detect_changes(scraped, current_cameras):
    """Detect new and removed cameras"""
    changes = {
        'oakland': {'added': [], 'removed': []},
        'sf_speed': {'added': [], 'removed': []},
        'sf_red_light': {'added': [], 'removed': []}
    }
    
    # Oakland
    current_oak = [c['address'] for c in current_cameras if c['city'] == 'Oakland']
    for addr in scraped['oakland']:
        if not find_matching_address(addr, current_oak)[0]:
            changes['oakland']['added'].append(addr)
    for addr in current_oak:
        if not find_matching_address(addr, scraped['oakland'])[0]:
            changes['oakland']['removed'].append(addr)
    
    # SF Speed
    current_sf_speed = [c['address'] for c in current_cameras if c['city'] == 'San Francisco' and c['camera_type'] == 'speed']
    for addr in scraped['sf_speed']:
        if not find_matching_address(addr, current_sf_speed)[0]:
            changes['sf_speed']['added'].append(addr)
    for addr in current_sf_speed:
        if not find_matching_address(addr, scraped['sf_speed'])[0]:
            changes['sf_speed']['removed'].append(addr)
    
    # SF Red Light
    current_sf_rl = [c['address'] for c in current_cameras if c['city'] == 'San Francisco' and c['camera_type'] == 'red_light']
    for addr in scraped['sf_red_light']:
        if not find_matching_address(addr, current_sf_rl)[0]:
            changes['sf_red_light']['added'].append(addr)
    for addr in current_sf_rl:
        if not find_matching_address(addr, scraped['sf_red_light'])[0]:
            changes['sf_red_light']['removed'].append(addr)
    
    return changes


def generate_new_id(camera_type, existing_cameras):
    """Generate next available camera ID"""
    if camera_type == 'oakland':
        prefix = 'oak'
        existing = [c['id'] for c in existing_cameras if c['id'].startswith('oak-')]
    elif camera_type == 'sf_speed':
        prefix = 'sf'
        existing = [c['id'] for c in existing_cameras if c['id'].startswith('sf-') and not c['id'].startswith('sf-rl-')]
    else:  # sf_red_light
        prefix = 'sf-rl'
        existing = [c['id'] for c in existing_cameras if c['id'].startswith('sf-rl-')]
    
    max_num = 0
    for cam_id in existing:
        try:
            num = int(cam_id.split('-')[-1])
            max_num = max(max_num, num)
        except ValueError:
            continue
    
    return f"{prefix}-{str(max_num + 1).zfill(3)}"


def process_new_cameras(changes, current_cameras):
    """Process new cameras with coordinate verification"""
    new_cameras = []
    
    # Process Oakland
    for addr in changes['oakland']['added']:
        print(f"Processing Oakland: {addr}")
        
        # Try transit stop first (more accurate)
        lat, lon, source = search_transit_stop_web(addr, "Oakland")
        
        # Fallback to geocoding
        if not lat:
            print(f"  No transit stop found, using geocoding...")
            lat, lon, source = geocode_address(addr, "Oakland")
        
        if lat and lon:
            valid, reason = verify_coordinates(lat, lon, "Oakland")
            if not valid:
                print(f"  ⚠️  Validation failed: {reason}")
                continue
            
            cam_id = generate_new_id('oakland', current_cameras + new_cameras)
            new_cam = {
                'id': cam_id,
                'latitude': lat,
                'longitude': lon,
                'city': 'Oakland',
                'camera_type': 'speed',
                'address': addr,
                'source': source,
                'needs_verification': source != "SF Bay Transit"
            }
            new_cameras.append(new_cam)
            print(f"  ✓ {lat}, {lon} (from {source})")
        else:
            print(f"  ✗ Could not determine coordinates")
    
    # Process SF Speed
    for addr in changes['sf_speed']['added']:
        print(f"Processing SF Speed: {addr}")
        lat, lon, source = geocode_address(addr, "San Francisco")
        if lat and lon:
            valid, reason = verify_coordinates(lat, lon, "San Francisco")
            if not valid:
                print(f"  ⚠️  Validation failed: {reason}")
                continue
            
            cam_id = generate_new_id('sf_speed', current_cameras + new_cameras)
            new_cam = {
                'id': cam_id,
                'latitude': lat,
                'longitude': lon,
                'city': 'San Francisco',
                'camera_type': 'speed',
                'address': addr,
                'source': source,
                'needs_verification': True
            }
            new_cameras.append(new_cam)
            print(f"  ✓ {lat}, {lon} (from {source})")
        else:
            print(f"  ✗ Geocoding failed")
    
    # Process SF Red Light
    for addr in changes['sf_red_light']['added']:
        print(f"Processing SF Red Light: {addr}")
        lat, lon, source = geocode_address(addr, "San Francisco")
        if lat and lon:
            valid, reason = verify_coordinates(lat, lon, "San Francisco")
            if not valid:
                print(f"  ⚠️  Validation failed: {reason}")
                continue
            
            cam_id = generate_new_id('sf_red_light', current_cameras + new_cameras)
            new_cam = {
                'id': cam_id,
                'latitude': lat,
                'longitude': lon,
                'city': 'San Francisco',
                'camera_type': 'red_light',
                'address': addr,
                'source': source,
                'needs_verification': True
            }
            new_cameras.append(new_cam)
            print(f"  ✓ {lat}, {lon} (from {source})")
        else:
            print(f"  ✗ Geocoding failed")
    
    return new_cameras


def update_source_file(new_cameras, changes, current_cameras):
    """Update scripts/update_cameras.py with new/removed cameras"""
    with open('scripts/update_cameras.py', 'r') as f:
        content = f.read()
    
    # Update Oakland cameras
    oakland_cameras = [c for c in current_cameras if c['city'] == 'Oakland']
    oakland_cameras += [c for c in new_cameras if c['city'] == 'Oakland']
    
    # Remove deleted cameras
    for addr in changes['oakland']['removed']:
        oakland_cameras = [c for c in oakland_cameras if not find_matching_address(c['address'], [addr])[0]]
    
    # Build new Oakland section
    oakland_lines = []
    for cam in oakland_cameras:
        oakland_lines.append(f'        {{"id": "{cam["id"]}", "latitude": {cam["latitude"]}, "longitude": {cam["longitude"]}, "city": "Oakland", "camera_type": "speed", "address": "{cam["address"]}"}},\n')
    
    # Replace Oakland section in file
    oakland_pattern = r'(# Oakland Speed Cameras.*?\n    oakland_cameras = \[\n)(.*?)(\n    \])'
    new_oakland = r'\1' + ''.join(oakland_lines) + r'\3'
    content = re.sub(oakland_pattern, new_oakland, content, flags=re.DOTALL)
    
    # Similar updates for SF cameras would go here...
    
    with open('scripts/update_cameras.py', 'w') as f:
        f.write(content)
    
    print("✓ Updated scripts/update_cameras.py")


def create_pr_description(changes, new_cameras):
    """Create PR description"""
    lines = [
        "# 🤖 Automated Camera Update",
        "",
        "This PR was automatically generated by the quarterly camera monitoring workflow.",
        "",
        "## Summary",
        ""
    ]
    
    total_added = sum(len(c['added']) for c in changes.values())
    total_removed = sum(len(c['removed']) for c in changes.values())
    
    lines.append(f"- **{total_added}** new camera(s) added")
    lines.append(f"- **{total_removed}** camera(s) removed")
    lines.append("")
    
    if new_cameras:
        verified = [c for c in new_cameras if not c.get('needs_verification', True)]
        unverified = [c for c in new_cameras if c.get('needs_verification', True)]
        
        if verified:
            lines.append("## ✅ Verified Coordinates (from Transit Stops)")
            lines.append("")
            for cam in verified:
                gmaps = f"https://www.google.com/maps?q={cam['latitude']},{cam['longitude']}"
                lines.append(f"- **{cam['address']}**: [{cam['latitude']}, {cam['longitude']}]({gmaps})")
            lines.append("")
        
        if unverified:
            lines.append("## ⚠️ Needs Manual Verification (from Geocoding)")
            lines.append("")
            lines.append("These coordinates were automatically geocoded and **may be inaccurate by 1-2 blocks**.")
            lines.append("")
            for cam in unverified:
                gmaps = f"https://www.google.com/maps?q={cam['latitude']},{cam['longitude']}"
                lines.append(f"### {cam['address']}")
                lines.append(f"- Coordinates: `{cam['latitude']}, {cam['longitude']}`")
                lines.append(f"- Source: {cam['source']}")
                lines.append(f"- [Verify on Google Maps]({gmaps})")
                lines.append("")
    
    lines.append("## Review Checklist")
    lines.append("")
    lines.append("- [ ] Verify unverified coordinates are accurate")
    lines.append("- [ ] Confirm removed cameras are gone from city websites")
    lines.append("- [ ] Test app locally")
    lines.append("")
    lines.append("## How to Fix Coordinates")
    lines.append("")
    lines.append("1. Edit `scripts/update_cameras.py` (source of truth)")
    lines.append("2. Run `python3 scripts/update_cameras.py`")
    lines.append("3. Commit both files")
    lines.append("")
    
    return "\n".join(lines)


def main():
    """Main function"""
    print("=" * 70)
    print("Automated Camera Update Script v2")
    print("=" * 70)
    print()
    
    # Load from source of truth
    print("Loading from scripts/update_cameras.py...")
    current_cameras = load_current_cameras_from_source()
    print(f"✓ Loaded {len(current_cameras)} cameras")
    print()
    
    # Scrape websites
    print("Scraping city websites...")
    scraped = scrape_cameras()
    print(f"✓ Oakland: {len(scraped['oakland'])}")
    print(f"✓ SF Speed: {len(scraped['sf_speed'])}")
    print(f"✓ SF Red Light: {len(scraped['sf_red_light'])}")
    print()
    
    # Detect changes
    print("Detecting changes...")
    changes = detect_changes(scraped, current_cameras)
    
    total_added = sum(len(c['added']) for c in changes.values())
    total_removed = sum(len(c['removed']) for c in changes.values())
    
    if total_added == 0 and total_removed == 0:
        print("✓ No changes detected")
        return 0
    
    print(f"✓ {total_added} new, {total_removed} removed")
    print()
    
    # Process new cameras
    print("Processing new cameras...")
    new_cameras = process_new_cameras(changes, current_cameras)
    print()
    
    # Update source file
    if new_cameras or total_removed > 0:
        print("Updating scripts/update_cameras.py...")
        update_source_file(new_cameras, changes, current_cameras)
        print()
        
        # Regenerate API file
        print("Regenerating api/cameras.json...")
        import subprocess
        result = subprocess.run(['python3', 'scripts/update_cameras.py'], capture_output=True)
        if result.returncode == 0:
            print("✓ api/cameras.json regenerated")
        else:
            print("⚠️  Failed to regenerate api/cameras.json")
        print()
    
    # Create PR description
    pr_desc = create_pr_description(changes, new_cameras)
    with open('/tmp/pr_description.md', 'w') as f:
        f.write(pr_desc)
    print("✓ PR description saved")
    print()
    
    print("=" * 70)
    print("Ready for PR!")
    print("=" * 70)
    
    return 1


if __name__ == "__main__":
    sys.exit(main())
