# Implementation Plan: Traffic Camera Finder PWA

## Overview

This implementation plan breaks down the Traffic Camera Finder PWA into discrete coding tasks. The app is a client-side Progressive Web App that displays traffic enforcement cameras in Oakland and San Francisco on an interactive map using Leaflet. It includes offline support via Service Worker, local caching with localStorage, and iOS PWA installability.

The implementation follows an incremental approach: core infrastructure first, then data layer, then UI components, then PWA features, with testing integrated throughout.

## Tasks

- [x] 1. Set up project structure and core files
  - Create project directory structure (root, icons/, css/, js/)
  - Create `index.html` with basic HTML5 structure and meta tags for iOS PWA support
  - Create `manifest.json` with PWA configuration (name, icons, display mode, start_url)
  - Create `styles.css` with basic layout styles for map container and controls
  - Add Leaflet library via CDN links in HTML (CSS and JS)
  - _Requirements: 1.1, 1.4_

- [ ] 2. Implement CameraService for data fetching and caching
  - [x] 2.1 Create CameraService class with cache management methods
    - Implement `isCacheFresh()` to check if cached data is less than 7 days old
    - Implement `getCachedCameras()` to load camera data from localStorage
    - Implement `setCachedCameras(cameras)` to store camera data with timestamp in localStorage
    - Handle localStorage errors (quota exceeded, unavailable in private browsing)
    - _Requirements: 2.1, 2.2, 2.5_

  - [ ] 2.2 Write property test for cache staleness logic
    - **Property 1: Cache Staleness Determines Data Source**
    - **Validates: Requirements 2.2, 2.3**
    - Generate random timestamps (0 to 30 days ago)
    - Verify cache is used when age < 7 days, API called when age >= 7 days
    - Tag: `Feature: traffic-camera-finder, Property 1: Cache Staleness Determines Data Source`

  - [x] 2.3 Implement API fetching and parsing logic
    - Implement `fetchCamerasFromAPI()` to fetch camera data from external API
    - Add API response parser to convert API format to Camera model (id, lat, lng, city, type, location)
    - Implement error handling for network failures, timeouts, invalid JSON
    - _Requirements: 2.3, 2.4, 2.7_

  - [x] 2.4 Implement main getCameras() method with cache-first strategy
    - Check cache freshness first
    - Load from cache if fresh, otherwise fetch from API
    - Store fetched data in cache with timestamp
    - Fall back to stale cache if API fetch fails
    - Return error if no cache and fetch fails
    - _Requirements: 2.2, 2.3, 2.6, 2.7_

  - [ ] 2.5 Write property test for camera data round-trip preservation
    - **Property 2: Camera Data Round-Trip Preservation**
    - **Validates: Requirements 2.9**
    - Generate random Camera object arrays
    - Serialize to JSON, parse back, verify deep equality
    - Tag: `Feature: traffic-camera-finder, Property 2: Camera Data Round-Trip Preservation`

  - [ ] 2.6 Write unit tests for CameraService
    - Test cache freshness calculation with specific timestamps (0, 6.9, 7, 30 days)
    - Test successful API fetch and cache storage
    - Test failed API fetch with stale cache fallback
    - Test failed API fetch with no cache (error state)
    - Test localStorage quota exceeded handling
    - Test invalid JSON response handling
    - _Requirements: 2.1, 2.2, 2.3, 2.6, 2.7_

- [x] 3. Checkpoint - Verify CameraService functionality
  - Ensure all tests pass, ask the user if questions arise.

- [-] 4. Implement GeolocationService for user positioning
  - [x] 4.1 Create GeolocationService class with location detection
    - Implement `getUserLocation()` using browser Geolocation API
    - Implement `getDefaultCenter()` returning San Francisco center coordinates (37.7749, -122.4194)
    - Handle geolocation errors (PERMISSION_DENIED, POSITION_UNAVAILABLE, TIMEOUT)
    - Return default center on any geolocation error
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ] 4.2 Write unit tests for GeolocationService
    - Test successful geolocation with mock coordinates
    - Test permission denied fallback to default center
    - Test position unavailable fallback
    - Test timeout fallback
    - _Requirements: 3.1, 3.3, 3.4_

- [-] 5. Implement MapView for interactive map rendering
  - [x] 5.1 Create MapView class and initialize Leaflet map
    - Implement `init(container, center)` to create Leaflet map instance
    - Add OpenStreetMap tile layer
    - Set initial zoom level to show Oakland and SF area
    - Configure map for touch gestures (pinch-to-zoom, pan)
    - _Requirements: 4.1, 4.4, 4.5_

  - [ ] 5.2 Write property test for map centering
    - **Property 3: Map Centers on Provided Coordinates**
    - **Validates: Requirements 3.2**
    - Generate random valid coordinates (lat: -90 to 90, lng: -180 to 180)
    - Initialize map, verify center matches input coordinates
    - Tag: `Feature: traffic-camera-finder, Property 3: Map Centers on Provided Coordinates`

  - [x] 5.3 Implement camera marker rendering
    - Implement `renderCameraMarkers(cameras, cityFilter)` to add camera markers to map
    - Create custom red pin icon for camera markers
    - Filter cameras by city before rendering
    - Store marker references for later clearing
    - _Requirements: 4.1, 5.2, 5.3, 5.4_

  - [ ] 5.4 Write property test for marker rendering count
    - **Property 4: All Cameras Render as Markers**
    - **Validates: Requirements 4.1**
    - Generate random Camera arrays (0 to 500 cameras)
    - Render markers, verify marker count equals camera count
    - Tag: `Feature: traffic-camera-finder, Property 4: All Cameras Render as Markers`

  - [x] 5.5 Implement user position marker
    - Implement `renderUserMarker(position)` to add user position marker
    - Create custom blue circle icon with pulsing animation
    - Ensure user marker is visually distinct from camera markers
    - _Requirements: 4.2_

  - [x] 5.6 Implement camera popup functionality
    - Implement `showCameraPopup(camera)` to display camera information
    - Bind popup to camera marker click events
    - Format popup content with city name and camera type
    - _Requirements: 4.3_

  - [ ] 5.7 Write property test for popup content
    - **Property 5: Popup Displays Camera Information**
    - **Validates: Requirements 4.3**
    - Generate random Camera objects with various cities and types
    - Generate popup content, verify it contains city and type
    - Tag: `Feature: traffic-camera-finder, Property 5: Popup Displays Camera Information`

  - [x] 5.8 Implement marker clearing functionality
    - Implement `clearCameraMarkers()` to remove all camera markers from map
    - Ensure user marker is not removed when clearing camera markers
    - _Requirements: 5.5_

  - [ ] 5.9 Write unit tests for MapView
    - Test map initialization with specific center coordinates
    - Test user marker rendering with distinct style
    - Test initial map bounds include Oakland and SF
    - _Requirements: 3.2, 4.2, 4.5_

- [ ] 6. Checkpoint - Verify map rendering functionality
  - Ensure all tests pass, ask the user if questions arise.

- [-] 7. Implement FilterController for city filtering
  - [x] 7.1 Create FilterController class with filter UI management
    - Implement `init(container, onFilterChange)` to create filter buttons (All, Oakland, San Francisco)
    - Implement `getActiveFilter()` to return current filter state
    - Implement `setActiveFilter(filter)` to update active button styling
    - Bind click events to filter buttons
    - Call onFilterChange callback when filter changes
    - _Requirements: 5.1_

  - [ ] 7.2 Write property test for city filtering logic
    - **Property 6: City Filter Shows Only Matching Cameras**
    - **Validates: Requirements 5.2, 5.3, 5.4**
    - Generate random Camera arrays with mixed cities
    - Apply each filter (Oakland, San Francisco, All)
    - Verify filtered results match filter criteria
    - Tag: `Feature: traffic-camera-finder, Property 6: City Filter Shows Only Matching Cameras`

  - [ ] 7.3 Write unit tests for FilterController
    - Test filter state changes update active filter
    - Test filter changes trigger callback
    - Test filter UI contains correct buttons
    - _Requirements: 5.1, 5.5_

- [-] 8. Implement StatusDisplay for user feedback
  - [x] 8.1 Create StatusDisplay class for loading and error messages
    - Implement `showLoading(message)` to display loading indicator
    - Implement `showError(message)` to display error messages
    - Implement `showNotice(message)` to display informational notices
    - Implement `hide()` to clear all status messages
    - Add CSS styling for status messages (loading spinner, error/notice colors)
    - _Requirements: 2.6, 2.7, 3.3, 3.4, 3.5_

  - [ ] 8.2 Write unit tests for StatusDisplay
    - Test loading, error, and notice messages display correctly
    - Test messages can be hidden
    - _Requirements: 3.5_

- [x] 9. Wire components together in main application logic
  - [x] 9.1 Create main app.js with application initialization
    - Initialize StatusDisplay
    - Show loading indicator on app start
    - Initialize GeolocationService and request user location
    - Initialize CameraService and fetch camera data
    - Initialize MapView with user location or default center
    - Initialize FilterController with filter change handler
    - Handle geolocation errors with appropriate notices
    - Handle camera fetch errors with appropriate messages
    - _Requirements: 2.6, 2.7, 2.8, 3.3, 3.4, 3.5_

  - [x] 9.2 Implement filter change handler
    - Clear existing camera markers when filter changes
    - Re-render camera markers with new filter
    - Ensure no network request is made on filter change
    - _Requirements: 5.2, 5.3, 5.4, 5.5_

  - [x] 9.3 Add error handling for edge cases
    - Handle missing required camera fields (filter out invalid cameras)
    - Log warnings for invalid camera data
    - Display error if all cameras are invalid
    - _Requirements: 2.4_

- [x] 10. Checkpoint - Verify end-to-end application flow
  - Ensure all tests pass, ask the user if questions arise.

- [-] 11. Implement Service Worker for offline support
  - [x] 11.1 Create sw.js with Service Worker lifecycle
    - Implement install event to cache app shell assets (HTML, CSS, JS, icons, Leaflet files)
    - Implement activate event to clean up old caches
    - Implement fetch event with cache-first strategy for app shell
    - Implement network-first strategy for map tiles with cache fallback
    - Set cache version for cache busting on updates
    - _Requirements: 1.2, 6.1, 6.3_

  - [x] 11.2 Register Service Worker in main application
    - Add Service Worker registration code in app.js
    - Handle registration success and failure gracefully
    - Log registration status to console
    - _Requirements: 1.2_

  - [ ] 11.3 Write integration tests for offline functionality
    - Test app shell loads from cache when offline
    - Test offline error message displays when fetching camera data offline
    - Test Service Worker cache updates on new version deployment
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 12. Add PWA manifest and iOS-specific meta tags
  - [x] 12.1 Configure manifest.json for iOS installability
    - Verify manifest includes all required fields (name, short_name, start_url, display, icons)
    - Set start_url to match GitHub Pages subdirectory path (/traffic-camera-finder/)
    - Ensure icons array includes 192x192 and 512x512 PNG icons
    - _Requirements: 1.1_

  - [x] 12.2 Add iOS-specific meta tags to index.html
    - Add apple-mobile-web-app-capable meta tag
    - Add apple-mobile-web-app-status-bar-style meta tag
    - Add apple-mobile-web-app-title meta tag
    - Add apple-touch-icon link tag
    - _Requirements: 1.4_

  - [x] 12.3 Create app icons
    - Generate 192x192 PNG icon for manifest
    - Generate 512x512 PNG icon for manifest
    - Generate 180x180 PNG apple-touch-icon (no transparency, square)
    - Place icons in icons/ directory
    - _Requirements: 1.1, 1.4_

- [x] 13. Configure deployment for GitHub Pages
  - [x] 13.1 Set up GitHub Pages deployment
    - Ensure all file paths are relative or use correct subdirectory path
    - Verify manifest.json start_url matches GitHub Pages path
    - Test HTTPS requirement for Service Worker and Geolocation API
    - Create README.md with deployment instructions
    - _Requirements: 1.2, 1.3_

- [ ] 14. Final integration and testing
  - [ ] 14.1 Run full property-based test suite
    - Execute all 6 property tests with minimum 100 iterations each
    - Verify all properties pass
    - _Requirements: All_

  - [ ] 14.2 Run full unit test suite
    - Execute all unit tests for CameraService, GeolocationService, MapView, FilterController, StatusDisplay
    - Verify 80%+ code coverage for business logic
    - _Requirements: All_

  - [ ] 14.3 Manual testing on iOS Safari
    - Test "Add to Home Screen" functionality
    - Verify standalone mode launches without Safari UI
    - Test offline functionality (load app, disable network, reload)
    - Test touch gestures (pinch-to-zoom, pan)
    - Test camera marker popups
    - Test city filtering
    - _Requirements: 1.3, 4.4, 6.1_

  - [ ] 14.4 Performance testing
    - Test camera data fetch on throttled LTE connection
    - Verify total load time < 10 seconds
    - _Requirements: 2.8_

- [x] 15. Final checkpoint - Deployment ready
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The app uses JavaScript with Leaflet for mapping, localStorage for caching, and Service Worker for offline support
- Deployment target is GitHub Pages with HTTPS (required for Service Worker and Geolocation API)
- Camera data source API endpoint is not yet determined - implementation will need to identify actual data source or use static JSON file
