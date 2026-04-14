#!/usr/bin/env python3
"""
Verify Oakland camera coordinates against SF Bay Transit data
"""

import json

# Load current camera data from API
with open('../api/cameras.json', 'r') as f:
    all_cameras = json.load(f)

# Filter Oakland cameras
current_cameras = [
    {
        "id": cam["id"],
        "lat": cam["latitude"],
        "lon": cam["longitude"],
        "address": cam["address"]
    }
    for cam in all_cameras
    if cam["city"] == "Oakland"
]

# Verified coordinates from SF Bay Transit (manually collected)
verified = {
    "oak-001": {"lat": 37.8313, "lon": -122.2679, "source": "MLK Jr Way & 42nd St"},
    "oak-002": {"lat": 37.8501, "lon": -122.2523, "source": "College Ave & Claremont Ave (51506)"},
    "oak-003": {"lat": 37.7848, "lon": -122.2319, "source": "Foothill Blvd & 24th Ave (55150)"},
    "oak-004": {"lat": 37.7884, "lon": -122.2398, "source": "Foothill Blvd & 19th Ave (52397)"},
    "oak-005": {"lat": 37.8041, "lon": -122.2880, "source": "7th St & Adeline St (56884)"},
    "oak-007": {"lat": 37.8154, "lon": -122.2641, "source": "Broadway & 27th St (verified)"},
    "oak-008": {"lat": 37.8153, "lon": -122.2747, "source": "San Pablo Ave & 25th St (59499)"},
    "oak-009": {"lat": 37.7990, "lon": -122.2732, "source": "7th St & Franklin St"},
    "oak-010": {"lat": 37.7852, "lon": -122.1899, "source": "MacArthur Blvd & Enos Ave"},
    "oak-011": {"lat": 37.7878, "lon": -122.2211, "source": "Fruitvale Ave & Logan St (51248)"},
}

print("=" * 80)
print("Oakland Camera Coordinate Verification")
print("=" * 80)
print()

issues = []

for cam in current_cameras:
    cam_id = cam['id']
    
    if cam_id in verified:
        ver = verified[cam_id]
        lat_diff = abs(cam['lat'] - ver['lat'])
        lon_diff = abs(cam['lon'] - ver['lon'])
        
        # Calculate approximate distance in meters
        # 1 degree latitude ≈ 111 km
        # 1 degree longitude ≈ 85 km (at SF latitude)
        dist_meters = ((lat_diff * 111000) ** 2 + (lon_diff * 85000) ** 2) ** 0.5
        
        status = "✅ GOOD" if dist_meters < 200 else "⚠️  CHECK" if dist_meters < 500 else "❌ BAD"
        
        print(f"{cam_id}: {cam['address']}")
        print(f"  Current:  {cam['lat']}, {cam['lon']}")
        print(f"  Verified: {ver['lat']}, {ver['lon']} ({ver['source']})")
        print(f"  Distance: {dist_meters:.0f}m {status}")
        print()
        
        if dist_meters >= 200:
            issues.append({
                'id': cam_id,
                'address': cam['address'],
                'current': (cam['lat'], cam['lon']),
                'verified': (ver['lat'], ver['lon']),
                'distance': dist_meters
            })
    else:
        print(f"{cam_id}: {cam['address']}")
        print(f"  Current: {cam['lat']}, {cam['lon']}")
        print(f"  Status: ⏸️  NOT VERIFIED (no transit stop data found)")
        print()

print("=" * 80)
print("Summary")
print("=" * 80)
print(f"Verified: {len(verified)}/{len(current_cameras)} cameras")
print(f"Issues found: {len(issues)}")
print()

if issues:
    print("Cameras needing coordinate updates:")
    for issue in issues:
        print(f"  {issue['id']}: {issue['address']}")
        print(f"    Distance off: {issue['distance']:.0f}m")
        print(f"    Update: {issue['current']} → {issue['verified']}")
        print()
