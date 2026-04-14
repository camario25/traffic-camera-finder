#!/usr/bin/env python3
"""
Geocode all camera locations to get accurate coordinates.
This script uses Nominatim (OpenStreetMap) geocoding service.
Run this locally to generate accurate coordinates.
"""

import json
import time
from urllib.request import urlopen, Request
from urllib.parse import quote_plus

def geocode_address(address, city):
    """Geocode an address using Nominatim"""
    try:
        query = f"{address}, {city}, California"
        encoded_query = quote_plus(query)
        url = f"https://nominatim.openstreetmap.org/search?q={encoded_query}&format=json&limit=1"
        
        req = Request(url, headers={'User-Agent': 'TrafficCameraFinder/1.0 (Educational Project)'})
        
        with urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
            
            if data and len(data) > 0:
                lat = round(float(data[0]['lat']), 4)
                lon = round(float(data[0]['lon']), 4)
                print(f"  ✓ {address[:50]:50s} → {lat}, {lon}")
                time.sleep(1.1)  # Rate limit: max 1 request per second
                return (lat, lon)
            else:
                print(f"  ✗ No results for: {address}")
                time.sleep(1.1)
                return (None, None)
    except Exception as e:
        print(f"  ✗ Error geocoding {address}: {e}")
        time.sleep(1.1)
        return (None, None)

def main():
    print("=" * 70)
    print("Camera Location Geocoder")
    print("=" * 70)
    print()
    print("This will geocode all camera addresses to get accurate coordinates.")
    print("Rate limited to 1 request/second (Nominatim requirement).")
    print("Total time: ~90 seconds for 64 cameras")
    print()
    
    # Oakland cameras - using midpoint addresses
    oakland_addresses = [
        ("4250 Martin Luther King Jr Way", "Martin Luther King Jr Way (42nd-43rd St)"),
        ("Claremont Ave and College Ave", "Claremont Ave (Hillegass-College Ave)"),
        ("Foothill Blvd and 22nd Ave", "Foothill Blvd (Irving St-24th Ave)"),
        ("Foothill Blvd and 19th Ave", "Foothill Blvd (19th-20th Ave)"),
        ("7th St and Linden St", "7th St (Adeline-Linden St)"),
        ("West Grand Ave and Linden St", "West Grand Ave (Chestnut-Linden St)"),
        ("Broadway and 26th St", "Broadway (26th-27th St)"),
        ("San Pablo Ave and Athens Ave", "San Pablo Ave (Athens Ave-Sycamore St)"),
        ("7th St and Franklin St", "7th St (Broadway-Franklin St)"),
        ("MacArthur Blvd and Enos Ave", "MacArthur Blvd (Green Acre Rd-Enos Ave)"),
        ("Fruitvale Ave and Logan St", "Fruitvale Ave (Galindo-Logan St)"),
        ("International Blvd and 40th Ave", "International Blvd (40th-41st Ave)"),
        ("Hegenberger Rd and Spencer St", "Hegenberger Rd (Spencer-Hawley St)"),
        ("73rd Ave and Fresno St", "73rd Ave (Fresno St-Krause Ave)"),
        ("Bancroft Ave and 86th Ave", "Bancroft Ave (86th-Auseon Ave)"),
        ("98th Ave and Blake Dr", "98th Ave (Blake Dr-Gould St)"),
        ("98th Ave and Cherry St", "98th Ave (Cherry-Birch St)"),
        ("Bancroft Ave and 61st Ave", "Bancroft Ave (61st-62nd Ave)"),
    ]
    
    # SF speed camera addresses - using midpoint addresses
    sf_speed_addresses = [
        ("Fulton St and 42nd Ave", "Fulton St (42nd-43rd Ave)"),
        ("Lincoln Way and 27th Ave", "Lincoln Way (27th-28th Ave)"),
        ("Geary Blvd and 7th Ave", "Geary Blvd (7th-8th Ave)"),
        ("Fulton St and Arguello Blvd", "Fulton St (2nd Ave-Arguello Blvd)"),
        ("Geary Blvd and Webster St", "Geary Blvd (Webster-Buchanan St)"),
        ("Turk St and Polk St", "Turk St (Van Ness-Polk St)"),
        ("Bay St and Gough St", "Bay St (Octavia-Gough St)"),
        ("Franklin St and Green St", "Franklin St (Union-Green St)"),
        ("Columbus Ave and Greenwich St", "Columbus Ave (Lombard-Greenwich St)"),
        ("Broadway and Stockton St", "Broadway (Powell-Stockton St)"),
        ("Embarcadero and Battery St", "Embarcadero (Green St-Battery St)"),
        ("Mission St and 8th St", "Mission St (8th-9th St)"),
        ("10th St and Folsom St", "10th St (Harrison-Folsom St)"),
        ("9th St and Harrison St", "9th St (Bryant-Harrison St)"),
        ("7th St and Folsom St", "7th St (Harrison-Folsom St)"),
        ("Harrison St and 4th St", "Harrison St (4th-5th St)"),
        ("Bryant St and 2nd St", "Bryant St (2nd-3rd St)"),
        ("King St and 4th St", "King St (4th-5th St)"),
        ("Market St and Douglass St", "Market St (Danvers-Douglass St)"),
        ("Guerrero St and 19th St", "Guerrero St (19th-20th St)"),
        ("16th St and Potrero Ave", "16th St (Bryant-Potrero Ave)"),
        ("San Jose Ave and 29th St", "San Jose Ave (29th-30th St)"),
        ("Cesar Chavez St and Harrison St", "Cesar Chavez St (Folsom-Harrison St)"),
        ("Cesar Chavez St and Tennessee St", "Cesar Chavez St (Indiana-Tennessee St)"),
        ("3rd St and Jamestown Ave", "3rd St (Key Ave-Jamestown Ave)"),
        ("Bayshore Blvd and Tunnel Ave", "Bayshore Blvd (101 off-ramp-Tunnel Ave)"),
        ("Geneva Ave and Brookdale Ave", "Geneva Ave (Prague-Brookdale Ave)"),
        ("Mission St and Allison St", "Mission St (Ottawa-Allison St)"),
        ("Alemany Blvd and Naglee Ave", "Alemany Blvd (Farragut-Naglee Ave)"),
        ("Ocean Ave and Howth St", "Ocean Ave (Frida Kahlo Way-Howth St)"),
        ("San Jose Ave and Ocean Ave", "San Jose Ave (Santa Ynez-Ocean Ave)"),
        ("Monterey Blvd and Congo St", "Monterey Blvd (Edna-Congo St)"),
        ("Sloat Blvd and Skyline Blvd", "Sloat Blvd (41st Ave-Skyline Blvd)"),
    ]
    
    # SF red light camera addresses
    sf_redlight_addresses = [
        ("6th St and Bryant St", "6th St at Bryant St"),
        ("19th Ave and Sloat Blvd", "19th Ave at Sloat Blvd"),
        ("Fell St and Masonic Ave", "Fell St at Masonic Ave"),
        ("Hayes St and Polk St", "Hayes St at Polk St"),
        ("Market St and Octavia Blvd", "Market St at Octavia Blvd"),
        ("Oak St and Octavia Blvd", "Oak St at Octavia Blvd"),
        ("Park Presidio Blvd and Lake St", "Park Presidio Blvd at Lake St"),
        ("South Van Ness Ave and 14th St", "South Van Ness Ave at 14th St"),
        ("4th St and Harrison St", "4th St at Harrison St"),
        ("6th St and Folsom St", "6th St at Folsom St"),
        ("8th St and Folsom St", "8th St at Folsom St"),
        ("Divisadero St and Bush St", "Divisadero St at Bush St"),
        ("Van Ness Ave and Broadway", "Van Ness Ave at Broadway"),
    ]
    
    results = []
    
    # Geocode Oakland
    print("Geocoding Oakland cameras...")
    for i, (addr, display_addr) in enumerate(oakland_addresses, 1):
        lat, lon = geocode_address(addr, "Oakland")
        if lat and lon:
            results.append({
                "id": f"oak-{i:03d}",
                "latitude": lat,
                "longitude": lon,
                "city": "Oakland",
                "camera_type": "speed",
                "address": display_addr
            })
    
    # Geocode SF speed cameras
    print("\nGeocoding San Francisco speed cameras...")
    for i, (addr, display_addr) in enumerate(sf_speed_addresses, 1):
        lat, lon = geocode_address(addr, "San Francisco")
        if lat and lon:
            results.append({
                "id": f"sf-{i:03d}",
                "latitude": lat,
                "longitude": lon,
                "city": "San Francisco",
                "camera_type": "speed",
                "address": display_addr
            })
    
    # Geocode SF red light cameras
    print("\nGeocoding San Francisco red light cameras...")
    for i, (addr, display_addr) in enumerate(sf_redlight_addresses, 1):
        lat, lon = geocode_address(addr, "San Francisco")
        if lat and lon:
            results.append({
                "id": f"sf-rl-{i:03d}",
                "latitude": lat,
                "longitude": lon,
                "city": "San Francisco",
                "camera_type": "red_light",
                "address": display_addr
            })
    
    # Write results
    output_file = "api/cameras.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    print()
    print("=" * 70)
    print(f"✓ Successfully geocoded {len(results)}/64 cameras")
    print(f"✓ Saved to {output_file}")
    print("=" * 70)
    
    if len(results) < 64:
        print()
        print(f"⚠ Warning: {64 - len(results)} cameras failed to geocode")
        print("  You may need to manually add coordinates for these")

if __name__ == "__main__":
    main()
