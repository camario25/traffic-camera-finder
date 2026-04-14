#!/usr/bin/env python3
"""
Automated Camera Update Script
Scrapes websites, geocodes new cameras, and creates PR with changes.
"""

import json
import sys
import time
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


def geocode_address(address, city):
    """Geocode an address using Nominatim (OpenStreetMap)"""
    # Add city context to improve accuracy
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
            return round(lat, 4), round(lon, 4)
        else:
            return None, None
    except Exception as e:
        print(f"  Geocoding failed for '{address}': {e}")
        return None, None


def load_current_cameras():
    """Load current camera data"""
    try:
        with open('api/cameras.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
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
    
    # Find highest number
    max_num = 0
    for cam_id in existing:
        try:
            num = int(cam_id.split('-')[-1])
            max_num = max(max_num, num)
        except ValueError:
            continue
    
    return f"{prefix}-{str(max_num + 1).zfill(3)}"


def update_camera_data(changes, current_cameras):
    """Update camera data with new cameras (geocoded)"""
    updated_cameras = current_cameras.copy()
    geocoded_cameras = []
    
    # Process Oakland additions
    for addr in changes['oakland']['added']:
        print(f"Geocoding Oakland: {addr}")
        lat, lon = geocode_address(addr, "Oakland")
        if lat and lon:
            cam_id = generate_new_id('oakland', updated_cameras)
            new_cam = {
                "id": cam_id,
                "latitude": lat,
                "longitude": lon,
                "city": "Oakland",
                "camera_type": "speed",
                "address": addr
            }
            updated_cameras.append(new_cam)
            geocoded_cameras.append(new_cam)
            print(f"  ✓ {lat}, {lon}")
        else:
            print(f"  ✗ Geocoding failed")
    
    # Process SF Speed additions
    for addr in changes['sf_speed']['added']:
        print(f"Geocoding SF Speed: {addr}")
        lat, lon = geocode_address(addr, "San Francisco")
        if lat and lon:
            cam_id = generate_new_id('sf_speed', updated_cameras)
            new_cam = {
                "id": cam_id,
                "latitude": lat,
                "longitude": lon,
                "city": "San Francisco",
                "camera_type": "speed",
                "address": addr
            }
            updated_cameras.append(new_cam)
            geocoded_cameras.append(new_cam)
            print(f"  ✓ {lat}, {lon}")
        else:
            print(f"  ✗ Geocoding failed")
    
    # Process SF Red Light additions
    for addr in changes['sf_red_light']['added']:
        print(f"Geocoding SF Red Light: {addr}")
        lat, lon = geocode_address(addr, "San Francisco")
        if lat and lon:
            cam_id = generate_new_id('sf_red_light', updated_cameras)
            new_cam = {
                "id": cam_id,
                "latitude": lat,
                "longitude": lon,
                "city": "San Francisco",
                "camera_type": "red_light",
                "address": addr
            }
            updated_cameras.append(new_cam)
            geocoded_cameras.append(new_cam)
            print(f"  ✓ {lat}, {lon}")
        else:
            print(f"  ✗ Geocoding failed")
    
    # Process removals
    for addr in changes['oakland']['removed'] + changes['sf_speed']['removed'] + changes['sf_red_light']['removed']:
        updated_cameras = [c for c in updated_cameras if not find_matching_address(c['address'], [addr])[0]]
    
    return updated_cameras, geocoded_cameras


def create_pr_description(changes, geocoded_cameras):
    """Create PR description with changes and verification links"""
    lines = [
        "# Automated Camera Update",
        "",
        "This PR was automatically generated by the quarterly camera monitoring script.",
        "",
        "## Changes Detected",
        ""
    ]
    
    total_added = sum(len(c['added']) for c in changes.values())
    total_removed = sum(len(c['removed']) for c in changes.values())
    
    lines.append(f"- **{total_added}** new camera(s)")
    lines.append(f"- **{total_removed}** removed camera(s)")
    lines.append("")
    
    if changes['oakland']['added']:
        lines.append("### Oakland - New Cameras")
        for addr in changes['oakland']['added']:
            lines.append(f"- {addr}")
        lines.append("")
    
    if changes['sf_speed']['added']:
        lines.append("### SF Speed - New Cameras")
        for addr in changes['sf_speed']['added']:
            lines.append(f"- {addr}")
        lines.append("")
    
    if changes['sf_red_light']['added']:
        lines.append("### SF Red Light - New Cameras")
        for addr in changes['sf_red_light']['added']:
            lines.append(f"- {addr}")
        lines.append("")
    
    if geocoded_cameras:
        lines.append("## Geocoded Coordinates (Please Verify)")
        lines.append("")
        lines.append("⚠️ **Coordinates were automatically geocoded and may be inaccurate by 1-2 blocks.**")
        lines.append("")
        for cam in geocoded_cameras:
            google_maps_link = f"https://www.google.com/maps?q={cam['latitude']},{cam['longitude']}"
            lines.append(f"### {cam['address']}")
            lines.append(f"- **Coordinates**: {cam['latitude']}, {cam['longitude']}")
            lines.append(f"- **Verify**: [View on Google Maps]({google_maps_link})")
            lines.append("")
    
    lines.append("## Review Checklist")
    lines.append("")
    lines.append("- [ ] Verify all coordinates are accurate (within 1-2 blocks)")
    lines.append("- [ ] Check that removed cameras are actually gone from city websites")
    lines.append("- [ ] Test the app locally to ensure cameras display correctly")
    lines.append("")
    lines.append("---")
    lines.append("*Generated by `scripts/auto_update_cameras.py`*")
    
    return "\n".join(lines)


def main():
    """Main function"""
    print("=" * 70)
    print("Automated Camera Update Script")
    print("=" * 70)
    print()
    
    # Load current data
    print("Loading current camera data...")
    current_cameras = load_current_cameras()
    print(f"✓ Loaded {len(current_cameras)} cameras")
    print()
    
    # Scrape websites
    print("Scraping city websites...")
    scraped = scrape_cameras()
    print(f"✓ Oakland: {len(scraped['oakland'])} cameras")
    print(f"✓ SF Speed: {len(scraped['sf_speed'])} cameras")
    print(f"✓ SF Red Light: {len(scraped['sf_red_light'])} cameras")
    print()
    
    # Detect changes
    print("Detecting changes...")
    changes = detect_changes(scraped, current_cameras)
    
    total_added = sum(len(c['added']) for c in changes.values())
    total_removed = sum(len(c['removed']) for c in changes.values())
    
    if total_added == 0 and total_removed == 0:
        print("✓ No changes detected")
        return 0
    
    print(f"✓ Found {total_added} new cameras, {total_removed} removed")
    print()
    
    # Geocode new cameras
    print("Geocoding new cameras...")
    updated_cameras, geocoded_cameras = update_camera_data(changes, current_cameras)
    print()
    
    # Save updated data
    print("Saving updated camera data...")
    with open('api/cameras.json', 'w') as f:
        json.dump(updated_cameras, f, indent=2)
    print(f"✓ Saved {len(updated_cameras)} cameras to api/cameras.json")
    print()
    
    # Create PR description
    pr_description = create_pr_description(changes, geocoded_cameras)
    with open('/tmp/pr_description.md', 'w') as f:
        f.write(pr_description)
    print("✓ PR description saved to /tmp/pr_description.md")
    print()
    
    print("=" * 70)
    print("Changes ready for PR!")
    print("=" * 70)
    
    return 1  # Exit code 1 indicates changes were made


if __name__ == "__main__":
    sys.exit(main())
