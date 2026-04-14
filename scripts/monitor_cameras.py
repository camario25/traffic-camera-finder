#!/usr/bin/env python3
"""
Traffic Camera Monitor - Option 3 Enhanced with Playwright
Scrapes Oakland and SF websites to detect camera changes.
Compares count and addresses to api/cameras.json.
Creates GitHub issue if changes detected.
"""

import json
import sys
import os
from difflib import SequenceMatcher

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("ERROR: Playwright not installed")
    print("Install with: pip3 install playwright && playwright install chromium")
    sys.exit(1)


def similarity_ratio(a, b):
    """Calculate similarity between two strings (0.0 to 1.0)"""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def normalize_address(address):
    """Normalize address for comparison"""
    address = address.lower().strip()
    
    # Remove parentheses and their contents for range-style addresses
    # "Broadway (26th-27th St)" -> "Broadway"
    if '(' in address:
        address = address.split('(')[0].strip()
    
    # Normalize "from X to Y" format to just the main street
    # "Embarcadero from Green St to Battery St" -> "Embarcadero"
    if ' from ' in address:
        address = address.split(' from ')[0].strip()
    
    # Normalize common variations
    address = address.replace(' and ', ' at ')
    address = address.replace(' & ', ' at ')
    
    # Remove directional indicators
    for direction in [' (eastbound)', ' (westbound)', ' (northbound)', ' (southbound)']:
        address = address.replace(direction, '')
    
    # Normalize street abbreviations
    address = address.replace(' street', ' st')
    address = address.replace(' avenue', ' ave')
    address = address.replace(' boulevard', ' blvd')
    address = address.replace(' road', ' rd')
    
    return address.strip()


def scrape_oakland_cameras():
    """
    Scrape Oakland speed camera locations using Playwright.
    Returns list of address strings.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        try:
            url = "https://www.oaklandca.gov/Public-Safety-Streets/Traffic-Safety/Speed-Safety-Cameras-Pilot-Program"
            page.goto(url, wait_until="networkidle", timeout=30000)
            
            # Oakland addresses are in paragraph tags
            paragraphs = page.locator("p").all()
            addresses = []
            
            for para in paragraphs:
                text = para.inner_text().strip()
                # Look for street patterns with "from" and "to"
                if any(street_type in text for street_type in [' St', ' Ave', ' Blvd', ' Way', ' Rd']):
                    if 'from' in text.lower() and 'to' in text.lower() and len(text) < 100:
                        addresses.append(text)
            
            browser.close()
            return addresses
            
        except Exception as e:
            print(f"Warning: Could not scrape Oakland website: {e}")
            browser.close()
            return None


def scrape_sf_speed_cameras():
    """
    Scrape SF speed camera locations using Playwright.
    Returns list of address strings.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        try:
            url = "https://www.sfmta.com/speedcameras"
            page.goto(url, wait_until="networkidle", timeout=30000)
            
            # SF speed cameras are in table spans with class "tablesaw-cell-content"
            spans = page.locator("span.tablesaw-cell-content").all()
            addresses = []
            
            for span in spans:
                text = span.inner_text().strip()
                # Look for street patterns with "from" and "to"
                if any(street_type in text for street_type in [' St ', ' Ave ', ' Blvd ', ' Way ', ' Rd ']):
                    if 'from' in text.lower() and 'to' in text.lower():
                        addresses.append(text)
            
            browser.close()
            return addresses
            
        except Exception as e:
            print(f"Warning: Could not scrape SF speed camera website: {e}")
            browser.close()
            return None


def scrape_sf_red_light_cameras():
    """
    Scrape SF red light camera locations using Playwright.
    Returns list of address strings.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        try:
            url = "https://www.sfmta.com/node/7951"
            page.goto(url, wait_until="networkidle", timeout=30000)
            
            # SF red light cameras are in list items
            list_items = page.locator("li").all()
            addresses = []
            
            for item in list_items:
                text = item.inner_text().strip()
                # Look for street patterns with "at"
                if any(street_type in text for street_type in [' St ', ' Ave ', ' Blvd ', ' Way ', ' Rd ']):
                    if ' at ' in text.lower() and len(text) < 150:
                        addresses.append(text)
            
            browser.close()
            return addresses
            
        except Exception as e:
            print(f"Warning: Could not scrape SF red light camera website: {e}")
            browser.close()
            return None


def load_current_cameras():
    """Load current camera data from api/cameras.json"""
    try:
        with open('api/cameras.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print("ERROR: api/cameras.json not found")
        sys.exit(1)


def find_matching_address(address, address_list, threshold=0.7):
    """
    Find best matching address in list using fuzzy matching.
    Returns (match, score) or (None, 0) if no good match.
    """
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


def compare_cameras(scraped_addresses, current_cameras, city, camera_type):
    """
    Compare scraped addresses to current camera data.
    Returns dict with added, removed, and matched cameras.
    """
    # Extract current addresses for this city/type
    current_addresses = [
        cam['address'] for cam in current_cameras
        if cam['city'] == city and cam['camera_type'] == camera_type
    ]
    
    added = []
    removed = []
    matched = []
    
    # Find cameras in scraped data but not in current data
    for scraped_addr in scraped_addresses:
        match, score = find_matching_address(scraped_addr, current_addresses)
        if match:
            matched.append({'scraped': scraped_addr, 'current': match, 'score': score})
        else:
            added.append(scraped_addr)
    
    # Find cameras in current data but not in scraped data
    for current_addr in current_addresses:
        match, score = find_matching_address(current_addr, scraped_addresses)
        if not match:
            removed.append(current_addr)
    
    return {
        'added': added,
        'removed': removed,
        'matched': matched,
        'scraped_count': len(scraped_addresses),
        'current_count': len(current_addresses)
    }


def create_github_issue_body(changes):
    """Create GitHub issue body from detected changes"""
    lines = [
        "# Traffic Camera Changes Detected",
        "",
        "The automated camera monitor detected changes on official city websites.",
        "",
        "## Summary",
        ""
    ]
    
    total_added = sum(len(c['added']) for c in changes.values() if c)
    total_removed = sum(len(c['removed']) for c in changes.values() if c)
    
    lines.append(f"- **{total_added}** new camera(s) detected")
    lines.append(f"- **{total_removed}** camera(s) removed")
    lines.append("")
    
    # Oakland cameras
    if changes.get('oakland'):
        oak = changes['oakland']
        lines.append("## Oakland Speed Cameras")
        lines.append(f"- Website count: {oak['scraped_count']}")
        lines.append(f"- Current count: {oak['current_count']}")
        lines.append("")
        
        if oak['added']:
            lines.append("### New Cameras")
            for addr in oak['added']:
                lines.append(f"- {addr}")
            lines.append("")
        
        if oak['removed']:
            lines.append("### Removed Cameras")
            for addr in oak['removed']:
                lines.append(f"- {addr}")
            lines.append("")
    
    # SF speed cameras
    if changes.get('sf_speed'):
        sf = changes['sf_speed']
        lines.append("## San Francisco Speed Cameras")
        lines.append(f"- Website count: {sf['scraped_count']}")
        lines.append(f"- Current count: {sf['current_count']}")
        lines.append("")
        
        if sf['added']:
            lines.append("### New Cameras")
            for addr in sf['added']:
                lines.append(f"- {addr}")
            lines.append("")
        
        if sf['removed']:
            lines.append("### Removed Cameras")
            for addr in sf['removed']:
                lines.append(f"- {addr}")
            lines.append("")
    
    # SF red light cameras
    if changes.get('sf_red_light'):
        sf_rl = changes['sf_red_light']
        lines.append("## San Francisco Red Light Cameras")
        lines.append(f"- Website count: {sf_rl['scraped_count']}")
        lines.append(f"- Current count: {sf_rl['current_count']}")
        lines.append("")
        
        if sf_rl['added']:
            lines.append("### New Cameras")
            for addr in sf_rl['added']:
                lines.append(f"- {addr}")
            lines.append("")
        
        if sf_rl['removed']:
            lines.append("### Removed Cameras")
            for addr in sf_rl['removed']:
                lines.append(f"- {addr}")
            lines.append("")
    
    lines.append("## Next Steps")
    lines.append("")
    lines.append("1. Verify changes on official city websites")
    lines.append("2. For new cameras, get coordinates using:")
    lines.append("   - Google Maps: Right-click → 'What's here?'")
    lines.append("   - OpenStreetMap: Click location, see coordinates in URL")
    lines.append("3. Update `scripts/update_cameras.py` with new camera data")
    lines.append("4. Run `python3 scripts/update_cameras.py` to regenerate `api/cameras.json`")
    lines.append("5. Commit and push changes")
    lines.append("")
    lines.append("---")
    lines.append("*This issue was automatically created by the camera monitoring script*")
    
    return "\n".join(lines)


def create_github_issue(title, body):
    """Create GitHub issue using GitHub CLI or API"""
    # Try using GitHub CLI first
    try:
        import subprocess
        
        # Write body to temp file to avoid command line length issues
        with open('/tmp/github_issue_body.md', 'w') as f:
            f.write(body)
        
        result = subprocess.run(
            ['gh', 'issue', 'create', '--title', title, '--body-file', '/tmp/github_issue_body.md'],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print(f"✓ GitHub issue created: {result.stdout.strip()}")
            return True
        else:
            print(f"Warning: Could not create GitHub issue: {result.stderr}")
            print("\nIssue body:")
            print(body)
            return False
            
    except FileNotFoundError:
        print("Warning: GitHub CLI (gh) not installed")
        print("\nTo create issue manually, use this content:")
        print(f"\nTitle: {title}")
        print(f"\nBody:\n{body}")
        return False


def main():
    """Main monitoring function"""
    print("=" * 70)
    print("Traffic Camera Monitor - Option 3 Enhanced (Playwright)")
    print("=" * 70)
    print()
    
    # Load current camera data
    print("Loading current camera data...")
    current_cameras = load_current_cameras()
    print(f"✓ Loaded {len(current_cameras)} cameras from api/cameras.json")
    print()
    
    # Scrape websites
    print("Scraping official city websites using Playwright...")
    print()
    
    oakland_addresses = scrape_oakland_cameras()
    if oakland_addresses:
        print(f"✓ Oakland: Found {len(oakland_addresses)} cameras")
    else:
        print("✗ Oakland: Could not scrape")
    
    sf_speed_addresses = scrape_sf_speed_cameras()
    if sf_speed_addresses:
        print(f"✓ SF Speed: Found {len(sf_speed_addresses)} cameras")
    else:
        print("✗ SF Speed: Could not scrape")
    
    sf_rl_addresses = scrape_sf_red_light_cameras()
    if sf_rl_addresses:
        print(f"✓ SF Red Light: Found {len(sf_rl_addresses)} cameras")
    else:
        print("✗ SF Red Light: Could not scrape")
    
    print()
    
    # Compare and detect changes
    changes = {}
    has_changes = False
    
    if oakland_addresses:
        print("Comparing Oakland cameras...")
        oak_changes = compare_cameras(oakland_addresses, current_cameras, "Oakland", "speed")
        if oak_changes['added'] or oak_changes['removed']:
            changes['oakland'] = oak_changes
            has_changes = True
            print(f"  → {len(oak_changes['added'])} added, {len(oak_changes['removed'])} removed")
        else:
            print("  → No changes detected")
    
    if sf_speed_addresses:
        print("Comparing SF speed cameras...")
        sf_changes = compare_cameras(sf_speed_addresses, current_cameras, "San Francisco", "speed")
        if sf_changes['added'] or sf_changes['removed']:
            changes['sf_speed'] = sf_changes
            has_changes = True
            print(f"  → {len(sf_changes['added'])} added, {len(sf_changes['removed'])} removed")
        else:
            print("  → No changes detected")
    
    if sf_rl_addresses:
        print("Comparing SF red light cameras...")
        sf_rl_changes = compare_cameras(sf_rl_addresses, current_cameras, "San Francisco", "red_light")
        if sf_rl_changes['added'] or sf_rl_changes['removed']:
            changes['sf_red_light'] = sf_rl_changes
            has_changes = True
            print(f"  → {len(sf_rl_changes['added'])} added, {len(sf_rl_changes['removed'])} removed")
        else:
            print("  → No changes detected")
    
    print()
    print("=" * 70)
    
    if has_changes:
        print("CHANGES DETECTED!")
        print("=" * 70)
        print()
        
        # Create GitHub issue
        issue_title = "Camera Changes Detected - Manual Update Required"
        issue_body = create_github_issue_body(changes)
        
        create_github_issue(issue_title, issue_body)
        
        return 1  # Exit code 1 indicates changes detected
    else:
        print("No changes detected - camera data is up to date")
        print("=" * 70)
        return 0


if __name__ == "__main__":
    sys.exit(main())
