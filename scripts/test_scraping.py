#!/usr/bin/env python3
"""
Test script to scrape Oakland and SF camera websites using Playwright
"""

from playwright.sync_api import sync_playwright
import sys

def scrape_oakland():
    """Test scraping Oakland speed camera page"""
    print("=" * 70)
    print("Testing Oakland Speed Camera Website")
    print("=" * 70)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        try:
            # Navigate to Oakland page
            url = "https://www.oaklandca.gov/Public-Safety-Streets/Traffic-Safety/Speed-Safety-Cameras-Pilot-Program"
            print(f"\nNavigating to: {url}")
            response = page.goto(url, wait_until="networkidle", timeout=30000)
            
            print(f"Status: {response.status}")
            print(f"URL: {page.url}")
            print(f"Title: {page.title()}")
            print()
            
            # Try to find camera locations
            # Look for paragraphs containing street addresses
            paragraphs = page.locator("p").all()
            print(f"Found {len(paragraphs)} paragraphs")
            
            camera_addresses = []
            for para in paragraphs:
                text = para.inner_text().strip()
                # Look for street patterns with "from" and "to"
                if any(street_type in text for street_type in [' St', ' Ave', ' Blvd', ' Way', ' Rd']):
                    if 'from' in text.lower() and 'to' in text.lower() and len(text) < 100:
                        camera_addresses.append(text)
                        print(f"  → {text}")
            
            print(f"\nTotal camera addresses found: {len(camera_addresses)}")
            
            # Save page content for inspection
            content = page.content()
            with open('/tmp/oakland_page.html', 'w') as f:
                f.write(content)
            print("\nPage HTML saved to: /tmp/oakland_page.html")
            
            browser.close()
            return camera_addresses
            
        except Exception as e:
            print(f"Error: {e}")
            browser.close()
            return None


def scrape_sf_speed():
    """Test scraping SF speed camera page"""
    print("\n" + "=" * 70)
    print("Testing SF Speed Camera Website")
    print("=" * 70)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        try:
            # Navigate to SF page
            url = "https://www.sfmta.com/speedcameras"
            print(f"\nNavigating to: {url}")
            response = page.goto(url, wait_until="networkidle", timeout=30000)
            
            print(f"Status: {response.status}")
            print(f"URL: {page.url}")
            print(f"Title: {page.title()}")
            print()
            
            # Try to find camera locations in table spans
            # Look for spans with class "tablesaw-cell-content" that contain addresses
            spans = page.locator("span.tablesaw-cell-content").all()
            print(f"Found {len(spans)} table content spans")
            
            camera_addresses = []
            for span in spans:
                text = span.inner_text().strip()
                # Look for street patterns with "from" and "to"
                if any(street_type in text for street_type in [' St ', ' Ave ', ' Blvd ', ' Way ', ' Rd ']):
                    if 'from' in text.lower() and 'to' in text.lower():
                        camera_addresses.append(text)
                        print(f"  → {text}")
            
            print(f"\nTotal camera addresses found: {len(camera_addresses)}")
            
            # Save page content for inspection
            content = page.content()
            with open('/tmp/sf_speed_page.html', 'w') as f:
                f.write(content)
            print("\nPage HTML saved to: /tmp/sf_speed_page.html")
            
            browser.close()
            return camera_addresses
            
        except Exception as e:
            print(f"Error: {e}")
            browser.close()
            return None


def scrape_sf_red_light():
    """Test scraping SF red light camera page"""
    print("\n" + "=" * 70)
    print("Testing SF Red Light Camera Website")
    print("=" * 70)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        try:
            # Navigate to SF page (English version)
            url = "https://www.sfmta.com/node/7951"
            print(f"\nNavigating to: {url}")
            response = page.goto(url, wait_until="networkidle", timeout=30000)
            
            print(f"Status: {response.status}")
            print(f"URL: {page.url}")
            print(f"Title: {page.title()}")
            print()
            
            # Try to find camera locations
            list_items = page.locator("li").all()
            print(f"Found {len(list_items)} list items")
            
            camera_addresses = []
            for item in list_items[:100]:  # Check first 100 items
                text = item.inner_text().strip()
                # Look for street patterns
                if any(street_type in text for street_type in [' St', ' Ave', ' Blvd', ' Way', ' Rd']):
                    if len(text) < 150 and 'at' in text.lower():
                        camera_addresses.append(text)
                        print(f"  → {text}")
            
            print(f"\nTotal camera addresses found: {len(camera_addresses)}")
            
            # Save page content for inspection
            content = page.content()
            with open('/tmp/sf_redlight_page.html', 'w') as f:
                f.write(content)
            print("\nPage HTML saved to: /tmp/sf_redlight_page.html")
            
            browser.close()
            return camera_addresses
            
        except Exception as e:
            print(f"Error: {e}")
            browser.close()
            return None


def main():
    """Run all scraping tests"""
    oakland_cameras = scrape_oakland()
    sf_speed_cameras = scrape_sf_speed()
    sf_rl_cameras = scrape_sf_red_light()
    
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"Oakland: {len(oakland_cameras) if oakland_cameras else 0} cameras")
    print(f"SF Speed: {len(sf_speed_cameras) if sf_speed_cameras else 0} cameras")
    print(f"SF Red Light: {len(sf_rl_cameras) if sf_rl_cameras else 0} cameras")
    print()
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
