#!/usr/bin/env python3
"""
Traffic Camera Data Scraper
Scrapes Oakland and San Francisco official websites for camera locations
and updates api/cameras.json with the latest data.
"""

import json
import re
import sys
from typing import List, Dict
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

# Geocoding service (using Nominatim - free, no API key needed)
NOMINATIM_API = "https://nominatim.openstreetmap.org/search"

def geocode_address(address: str, city: str) -> tuple:
    """
    Geocode an address to latitude/longitude using Nominatim.
    Returns (lat, lng) or (None, None) if geocoding fails.
    """
    try:
        query = f"{address}, {city}, California"
        url = f"{NOMINATIM_API}?q={query}&format=json&limit=1"
        
        # Nominatim requires a User-Agent header
        req = Request(url, headers={'User-Agent': 'TrafficCameraFinder/1.0'})
        
        with urlopen(req) as response:
            data = json.loads(response.read().decode())
            
            if data and len(data) > 0:
                lat = float(data[0]['lat'])
                lon = float(data[0]['lon'])
                return (lat, lon)
    except Exception as e:
        print(f"Geocoding failed for {address}: {e}", file=sys.stderr)
    
    return (None, None)


def scrape_oakland_cameras() -> List[Dict]:
    """
    Scrape Oakland speed camera locations from official website.
    """
    url = "https://www.oaklandca.gov/Public-Safety-Streets/Traffic-Safety/Speed-Safety-Cameras-Pilot-Program"
    cameras = []
    
    try:
        req = Request(url, headers={'User-Agent': 'TrafficCameraFinder/1.0'})
        with urlopen(req) as response:
            html = response.read().decode('utf-8')
        
        # Parse the table data - looking for camera locations
        # Pattern: Camera ID, Street Segment, Posted Speed Limit
        pattern = r'<td[^>]*>(\d+)</td>\s*<td[^>]*>([^<]+)</td>\s*<td[^>]*>(\d+)\s*MPH</td>'
        matches = re.findall(pattern, html, re.IGNORECASE)
        
        for camera_id, street_segment, speed_limit in matches:
            street_segment = street_segment.strip()
            
            # Geocode the address
            lat, lng = geocode_address(street_segment, "Oakland")
            
            if lat and lng:
                cameras.append({
                    "id": f"oak-{camera_id.zfill(3)}",
                    "latitude": lat,
                    "longitude": lng,
                    "city": "Oakland",
                    "camera_type": "speed",
                    "address": street_segment
                })
                print(f"✓ Oakland camera {camera_id}: {street_segment}")
            else:
                print(f"✗ Failed to geocode Oakland camera {camera_id}: {street_segment}", file=sys.stderr)
        
        print(f"\nScraped {len(cameras)} Oakland cameras")
        
    except (URLError, HTTPError) as e:
        print(f"Error fetching Oakland data: {e}", file=sys.stderr)
    
    return cameras


def scrape_sf_speed_cameras() -> List[Dict]:
    """
    Scrape San Francisco speed camera locations from SFMTA website.
    """
    url = "https://www.sfmta.com/speedcameras"
    cameras = []
    
    try:
        req = Request(url, headers={'User-Agent': 'TrafficCameraFinder/1.0'})
        with urlopen(req) as response:
            html = response.read().decode('utf-8')
        
        # Parse the table data
        # Pattern: ID, Street Segment, Posted Speed Limit, Operation Status
        pattern = r'<td[^>]*>(\d+)</td>\s*<td[^>]*>([^<]+)</td>\s*<td[^>]*>(\d+)\s*MPH</td>'
        matches = re.findall(pattern, html, re.IGNORECASE)
        
        for camera_id, street_segment, speed_limit in matches:
            street_segment = street_segment.strip()
            
            # Geocode the address
            lat, lng = geocode_address(street_segment, "San Francisco")
            
            if lat and lng:
                cameras.append({
                    "id": f"sf-{camera_id.zfill(3)}",
                    "latitude": lat,
                    "longitude": lng,
                    "city": "San Francisco",
                    "camera_type": "speed",
                    "address": street_segment
                })
                print(f"✓ SF speed camera {camera_id}: {street_segment}")
            else:
                print(f"✗ Failed to geocode SF camera {camera_id}: {street_segment}", file=sys.stderr)
        
        print(f"\nScraped {len(cameras)} SF speed cameras")
        
    except (URLError, HTTPError) as e:
        print(f"Error fetching SF speed camera data: {e}", file=sys.stderr)
    
    return cameras


def scrape_sf_red_light_cameras() -> List[Dict]:
    """
    Scrape San Francisco red light camera locations from SFMTA website.
    """
    url = "https://www.sfmta.com/tl/node/7951"
    cameras = []
    
    try:
        req = Request(url, headers={'User-Agent': 'TrafficCameraFinder/1.0'})
        with urlopen(req) as response:
            html = response.read().decode('utf-8')
        
        # Parse red light camera intersections
        # Looking for patterns like "6th St at Bryant St"
        pattern = r'<li[^>]*>([^<]+\s+at\s+[^<]+)</li>'
        matches = re.findall(pattern, html, re.IGNORECASE)
        
        camera_id = 1
        for intersection in matches:
            intersection = intersection.strip()
            
            # Clean up direction indicators like (eastbound, southbound)
            intersection_clean = re.sub(r'\([^)]+\)', '', intersection).strip()
            
            # Geocode the intersection
            lat, lng = geocode_address(intersection_clean, "San Francisco")
            
            if lat and lng:
                cameras.append({
                    "id": f"sf-rl-{camera_id:03d}",
                    "latitude": lat,
                    "longitude": lng,
                    "city": "San Francisco",
                    "camera_type": "red_light",
                    "address": intersection_clean
                })
                print(f"✓ SF red light camera {camera_id}: {intersection_clean}")
                camera_id += 1
            else:
                print(f"✗ Failed to geocode SF red light camera: {intersection_clean}", file=sys.stderr)
        
        print(f"\nScraped {len(cameras)} SF red light cameras")
        
    except (URLError, HTTPError) as e:
        print(f"Error fetching SF red light camera data: {e}", file=sys.stderr)
    
    return cameras


def main():
    """
    Main function to scrape all camera data and update cameras.json
    """
    print("=" * 60)
    print("Traffic Camera Data Scraper")
    print("=" * 60)
    print()
    
    all_cameras = []
    
    # Scrape Oakland cameras
    print("Scraping Oakland cameras...")
    oakland_cameras = scrape_oakland_cameras()
    all_cameras.extend(oakland_cameras)
    print()
    
    # Scrape SF speed cameras
    print("Scraping San Francisco speed cameras...")
    sf_speed_cameras = scrape_sf_speed_cameras()
    all_cameras.extend(sf_speed_cameras)
    print()
    
    # Scrape SF red light cameras
    print("Scraping San Francisco red light cameras...")
    sf_red_light_cameras = scrape_sf_red_light_cameras()
    all_cameras.extend(sf_red_light_cameras)
    print()
    
    # Write to cameras.json
    output_file = "api/cameras.json"
    
    if all_cameras:
        with open(output_file, 'w') as f:
            json.dump(all_cameras, f, indent=2)
        
        print("=" * 60)
        print(f"✓ Successfully updated {output_file}")
        print(f"  Total cameras: {len(all_cameras)}")
        print(f"  - Oakland: {len(oakland_cameras)}")
        print(f"  - SF Speed: {len(sf_speed_cameras)}")
        print(f"  - SF Red Light: {len(sf_red_light_cameras)}")
        print("=" * 60)
        
        return 0
    else:
        print("=" * 60)
        print("✗ No camera data scraped. Check errors above.")
        print("=" * 60)
        return 1


if __name__ == "__main__":
    sys.exit(main())
