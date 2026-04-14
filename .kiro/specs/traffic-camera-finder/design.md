# Design Document: Traffic Camera Finder PWA

## Overview

The Traffic Camera Finder is a Progressive Web App that displays traffic enforcement camera locations (speed cameras and red-light cameras) in Oakland and San Francisco on an interactive map. The app is designed to run entirely client-side with no backend hosting, making it installable on iOS and Android devices via "Add to Home Screen".

### Key Design Goals

1. **Zero-infrastructure deployment**: Static files only, no server required
2. **iOS-first PWA experience**: Full standalone mode support on iPhone
3. **Offline-capable**: App shell loads without network, with graceful degradation
4. **Performance-optimized**: Smart caching reduces API calls and improves load times
5. **Simple, focused UX**: Map-centric interface with minimal controls

### Technology Stack

Based on research into lightweight, PWA-compatible solutions:

- **Mapping Library**: [Leaflet](https://leafletjs.com/) (~42KB) - Open-source, mobile-friendly, no vendor lock-in, excellent touch gesture support
- **Tile Provider**: OpenStreetMap tiles (free, no API key required)
- **Storage**: localStorage for camera data caching (simple key-value, synchronous, sufficient for JSON payload <5MB)
- **Service Worker**: Vanilla JavaScript for app shell caching
- **Build**: Static HTML/CSS/JS (no build step required, or optional bundler for optimization)

**Rationale for Leaflet over alternatives**:
- Mapbox GL JS requires API keys and has licensing complexity
- Leaflet is the most popular open-source option with proven iOS Safari compatibility
- Lightweight footprint aligns with PWA performance goals
- Raster tiles from OSM are simpler than vector tiles for this use case

**Rationale for localStorage over IndexedDB**:
- Camera data is a simple JSON array (~100-500 cameras, <1MB)
- No complex queries needed (load all, filter in memory)
- Synchronous API simplifies code (no async complexity for this use case)
- localStorage is universally supported and reliable for small datasets

---

## Architecture

### Component Structure

```
┌─────────────────────────────────────────┐
│           index.html (App Shell)        │
│  ┌───────────────────────────────────┐  │
│  │   Map View (Leaflet)              │  │
│  │   - Camera Markers                │  │
│  │   - User Position Marker          │  │
│  │   - Popup Info Windows            │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │   Filter Controls                 │  │
│  │   [All] [Oakland] [San Francisco] │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │   Status Messages                 │  │
│  │   (Loading, Errors, Notices)      │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
         ↓                    ↓
┌──────────────────┐   ┌──────────────────┐
│  CameraService   │   │ GeolocationService│
│  - fetchCameras()│   │ - getUserLocation()│
│  - getCached()   │   │ - getDefaultCenter()│
│  - setCached()   │   │                  │
└──────────────────┘   └──────────────────┘
         ↓
┌──────────────────┐
│  localStorage    │
│  - cameraData    │
│  - timestamp     │
└──────────────────┘
         ↓
┌──────────────────┐
│  External API    │
│  (Camera Feed)   │
└──────────────────┘
```

### Service Worker Architecture

```
Service Worker (sw.js)
├── Install Event
│   └── Cache app shell assets
│       ├── index.html
│       ├── styles.css
│       ├── app.js
│       ├── leaflet.js
│       ├── leaflet.css
│       └── icons/
├── Activate Event
│   └── Clean up old caches
└── Fetch Event
    ├── App shell requests → Cache first
    ├── Tile requests → Network first (with cache fallback)
    └── API requests → Network only (handled by app logic)
```

### Data Flow

1. **App Load**:
   - Service worker serves cached app shell (if available)
   - App initializes Leaflet map
   - Geolocation request fires
   - Camera data check: cached & fresh? → load from localStorage : fetch from API

2. **Camera Data Fetch**:
   - Check localStorage for `cameraData` and `cameraDataTimestamp`
   - If timestamp < 7 days old → use cached data
   - Else → fetch from API, parse, store in localStorage with new timestamp

3. **Map Rendering**:
   - Create Leaflet map centered on user location (or default)
   - Add tile layer (OpenStreetMap)
   - Add camera markers (filtered by active city filter)
   - Add user position marker (if geolocation succeeded)

4. **Filter Interaction**:
   - User clicks filter button
   - Clear existing camera markers
   - Re-render markers for selected city (or all)
   - No network request needed (data already in memory)

---

## Components and Interfaces

### 1. CameraService

**Responsibilities**: Fetch, parse, cache, and retrieve camera data

**Interface**:
```javascript
class CameraService {
  /**
   * Get camera data (from cache or API)
   * @returns {Promise<Camera[]>} Array of camera objects
   * @throws {Error} If fetch fails and no cache available
   */
  async getCameras()

  /**
   * Check if cached data exists and is fresh
   * @returns {boolean}
   */
  isCacheFresh()

  /**
   * Load cameras from localStorage
   * @returns {Camera[] | null}
   */
  getCachedCameras()

  /**
   * Fetch cameras from external API
   * @returns {Promise<Camera[]>}
   */
  async fetchCamerasFromAPI()

  /**
   * Store cameras in localStorage with timestamp
   * @param {Camera[]} cameras
   */
  setCachedCameras(cameras)
}
```

**Cache Staleness Logic**:
```javascript
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

isCacheFresh() {
  const timestamp = localStorage.getItem('cameraDataTimestamp');
  if (!timestamp) return false;
  const age = Date.now() - parseInt(timestamp, 10);
  return age < CACHE_MAX_AGE_MS;
}
```

### 2. GeolocationService

**Responsibilities**: Get user's current position or provide default fallback

**Interface**:
```javascript
class GeolocationService {
  /**
   * Request user's current position
   * @returns {Promise<{lat: number, lng: number}>}
   */
  async getUserLocation()

  /**
   * Get default center (SF geographic center)
   * @returns {{lat: number, lng: number}}
   */
  getDefaultCenter()
}
```

**Default Center**: San Francisco geographic center: `{lat: 37.7749, lng: -122.4194}`

**Error Handling**:
- `PERMISSION_DENIED` → Use default center, show notice
- `POSITION_UNAVAILABLE` → Use default center, show error
- `TIMEOUT` → Use default center, show error

### 3. MapView

**Responsibilities**: Render interactive map with markers and controls

**Interface**:
```javascript
class MapView {
  /**
   * Initialize Leaflet map
   * @param {HTMLElement} container
   * @param {{lat: number, lng: number}} center
   */
  init(container, center)

  /**
   * Add camera markers to map
   * @param {Camera[]} cameras
   * @param {string} cityFilter - 'all', 'oakland', 'san-francisco'
   */
  renderCameraMarkers(cameras, cityFilter)

  /**
   * Add user position marker
   * @param {{lat: number, lng: number}} position
   */
  renderUserMarker(position)

  /**
   * Clear all camera markers
   */
  clearCameraMarkers()

  /**
   * Show popup for camera marker
   * @param {Camera} camera
   */
  showCameraPopup(camera)
}
```

**Marker Styling**:
- Camera markers: Red pin icon with camera symbol
- User position: Blue circle with pulsing animation
- Popup content: City name, camera type (e.g., "San Francisco - Speed Camera")

### 4. FilterController

**Responsibilities**: Handle city filter UI and state

**Interface**:
```javascript
class FilterController {
  /**
   * Initialize filter buttons
   * @param {HTMLElement} container
   * @param {Function} onFilterChange - Callback(cityFilter)
   */
  init(container, onFilterChange)

  /**
   * Get current active filter
   * @returns {string} 'all' | 'oakland' | 'san-francisco'
   */
  getActiveFilter()

  /**
   * Set active filter (updates UI)
   * @param {string} filter
   */
  setActiveFilter(filter)
}
```

### 5. StatusDisplay

**Responsibilities**: Show loading indicators, errors, and notices

**Interface**:
```javascript
class StatusDisplay {
  /**
   * Show loading message
   * @param {string} message
   */
  showLoading(message)

  /**
   * Show error message
   * @param {string} message
   */
  showError(message)

  /**
   * Show informational notice
   * @param {string} message
   */
  showNotice(message)

  /**
   * Hide all status messages
   */
  hide()
}
```

---

## Data Models

### Camera

```javascript
/**
 * @typedef {Object} Camera
 * @property {string} id - Unique identifier
 * @property {number} lat - Latitude
 * @property {number} lng - Longitude
 * @property {string} city - 'Oakland' | 'San Francisco'
 * @property {string} type - 'Speed Camera' | 'Red Light Camera'
 * @property {string} [location] - Optional street address or intersection
 */
```

**Example**:
```json
{
  "id": "oak-001",
  "lat": 37.8044,
  "lng": -122.2712,
  "city": "Oakland",
  "type": "Speed Camera",
  "location": "International Blvd & 23rd Ave"
}
```

### CachedCameraData

```javascript
/**
 * localStorage schema
 * Key: 'cameraData' → JSON string of Camera[]
 * Key: 'cameraDataTimestamp' → Unix timestamp (ms) as string
 */
```

**Example localStorage state**:
```javascript
localStorage.setItem('cameraData', JSON.stringify([
  { id: 'oak-001', lat: 37.8044, lng: -122.2712, city: 'Oakland', type: 'Speed Camera' },
  // ... more cameras
]));
localStorage.setItem('cameraDataTimestamp', '1704067200000');
```

### API Response Format

**Assumption**: External API returns JSON array of camera objects. If the actual API format differs, a parsing adapter will be needed.

**Expected format**:
```json
[
  {
    "id": "oak-001",
    "latitude": 37.8044,
    "longitude": -122.2712,
    "city": "Oakland",
    "camera_type": "speed",
    "address": "International Blvd & 23rd Ave"
  }
]
```

**Parser** (if needed):
```javascript
function parseAPIResponse(apiData) {
  return apiData.map(item => ({
    id: item.id,
    lat: item.latitude,
    lng: item.longitude,
    city: item.city,
    type: item.camera_type === 'speed' ? 'Speed Camera' : 'Red Light Camera',
    location: item.address
  }));
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Cache Staleness Determines Data Source

*For any* cached camera data with an associated timestamp, when the cache age is less than 7 days, the system SHALL load data from cache without making a network request; when the cache age is 7 days or greater, the system SHALL fetch fresh data from the API.

**Validates: Requirements 2.2, 2.3**

### Property 2: Camera Data Round-Trip Preservation

*For any* valid Camera object array, serializing to JSON then parsing back to objects SHALL produce an equivalent array with all camera properties (id, lat, lng, city, type, location) preserved.

**Validates: Requirements 2.9**

### Property 3: Map Centers on Provided Coordinates

*For any* valid geographic coordinate pair (latitude, longitude) within reasonable bounds (-90 to 90 for lat, -180 to 180 for lng), initializing the map with those coordinates SHALL result in the map view being centered on that exact location.

**Validates: Requirements 3.2**

### Property 4: All Cameras Render as Markers

*For any* array of Camera objects, rendering those cameras on the map SHALL produce exactly one marker per camera, with each marker positioned at the camera's latitude and longitude.

**Validates: Requirements 4.1**

### Property 5: Popup Displays Camera Information

*For any* Camera object, when a marker popup is generated for that camera, the popup content SHALL contain both the camera's city name and camera type.

**Validates: Requirements 4.3**

### Property 6: City Filter Shows Only Matching Cameras

*For any* array of Camera objects and any city filter selection ('Oakland', 'San Francisco', or 'All'), the rendered markers SHALL include only cameras matching the filter criteria: Oakland filter shows only cameras where city='Oakland', San Francisco filter shows only cameras where city='San Francisco', and All filter shows all cameras regardless of city.

**Validates: Requirements 5.2, 5.3, 5.4**

---

## Error Handling

### Network Errors

**Camera API Fetch Failures**:
- **With stale cache available**: Load cached data, display notice: "Showing cached camera data (may be outdated). Unable to fetch latest data."
- **Without cache**: Display error: "Unable to load camera data. Please check your internet connection and try again."
- **Timeout (>10s)**: Treat as fetch failure, follow above logic

**Tile Loading Failures**:
- Leaflet handles tile errors gracefully (shows gray tiles)
- No additional error handling needed (map remains functional)

### Geolocation Errors

**Permission Denied**:
- Fall back to default center (SF: 37.7749, -122.4194)
- Display notice: "Location access denied. Showing default map view."

**Position Unavailable**:
- Fall back to default center
- Display error: "Unable to determine your location. Showing default map view."

**Timeout**:
- Fall back to default center
- Display error: "Location request timed out. Showing default map view."

### Storage Errors

**localStorage Quota Exceeded**:
- Catch exception during `localStorage.setItem()`
- Log warning to console
- Continue without caching (fetch fresh data each time)
- Display notice: "Unable to cache data. App will fetch fresh data on each load."

**localStorage Unavailable** (private browsing mode):
- Detect with try/catch on first access
- Disable caching entirely
- Fetch fresh data on every load
- Display notice: "Caching disabled. App will fetch fresh data on each load."

### Parsing Errors

**Invalid API Response**:
- Catch JSON parse errors
- Log error details to console
- Display error: "Received invalid data from camera service. Please try again later."
- Fall back to cached data if available

**Missing Required Fields**:
- Validate each camera object has `lat`, `lng`, `city`, `type`
- Filter out invalid cameras (log warning)
- Render valid cameras only
- If all cameras invalid: Display error: "Camera data is malformed. Please try again later."

### Service Worker Errors

**Registration Failure**:
- Log error to console
- App continues to function (just without offline support)
- No user-facing error (graceful degradation)

**Cache Failure**:
- Log error to console
- Service worker continues to function (network-only mode)
- No user-facing error

---

## Testing Strategy

### Unit Tests

Unit tests will verify specific examples, edge cases, and error conditions using a standard testing framework (e.g., Jest, Vitest).

**CameraService Tests**:
- Cache freshness calculation with specific timestamps (0 days, 6.9 days, 7 days, 30 days)
- Successful API fetch and cache storage
- Failed API fetch with stale cache fallback
- Failed API fetch with no cache (error state)
- localStorage quota exceeded handling
- Invalid JSON response handling

**GeolocationService Tests**:
- Successful geolocation with mock coordinates
- Permission denied fallback to default center
- Position unavailable fallback
- Timeout fallback

**MapView Tests**:
- Map initialization with specific center coordinates
- User marker rendering with distinct style
- Initial map bounds include Oakland and SF
- Filter UI contains correct buttons

**FilterController Tests**:
- Filter state changes update active filter
- Filter changes don't trigger network requests

**StatusDisplay Tests**:
- Loading, error, and notice messages display correctly
- Messages can be hidden

### Property-Based Tests

Property-based tests will verify universal properties across many generated inputs using a PBT library (e.g., [fast-check](https://github.com/dubzzz/fast-check) for JavaScript).

**Configuration**: Each property test MUST run a minimum of 100 iterations.

**Test Tags**: Each property test MUST include a comment tag referencing the design property:
```javascript
// Feature: traffic-camera-finder, Property 1: Cache Staleness Determines Data Source
```

**Property Test Suite**:

1. **Cache Staleness Logic** (Property 1)
   - Generate random timestamps (0 to 30 days ago)
   - Verify cache is used when age < 7 days
   - Verify API is called when age >= 7 days
   - Tag: `Feature: traffic-camera-finder, Property 1: Cache Staleness Determines Data Source`

2. **Camera Data Round-Trip** (Property 2)
   - Generate random Camera object arrays
   - Serialize to JSON, parse back
   - Verify all properties preserved (deep equality)
   - Tag: `Feature: traffic-camera-finder, Property 2: Camera Data Round-Trip Preservation`

3. **Map Centering** (Property 3)
   - Generate random valid coordinates (lat: -90 to 90, lng: -180 to 180)
   - Initialize map with coordinates
   - Verify map center matches input coordinates
   - Tag: `Feature: traffic-camera-finder, Property 3: Map Centers on Provided Coordinates`

4. **Marker Rendering Count** (Property 4)
   - Generate random Camera arrays (0 to 500 cameras)
   - Render markers
   - Verify marker count equals camera count
   - Tag: `Feature: traffic-camera-finder, Property 4: All Cameras Render as Markers`

5. **Popup Content** (Property 5)
   - Generate random Camera objects with various cities and types
   - Generate popup content
   - Verify popup contains camera's city and type (string matching)
   - Tag: `Feature: traffic-camera-finder, Property 5: Popup Displays Camera Information`

6. **City Filtering** (Property 6)
   - Generate random Camera arrays with mixed cities
   - Apply each filter ('Oakland', 'San Francisco', 'All')
   - Verify filtered results match filter criteria
   - Tag: `Feature: traffic-camera-finder, Property 6: City Filter Shows Only Matching Cameras`

### Integration Tests

Integration tests will verify end-to-end behavior with real or mocked external dependencies.

**PWA Installation** (Manual):
- Install app on iOS Safari via "Add to Home Screen"
- Verify standalone mode (no Safari UI)
- Verify home screen icon displays correctly

**Offline Functionality**:
- Load app with network enabled (cache app shell)
- Disable network
- Reload app
- Verify app shell loads from cache
- Verify offline error message for camera data fetch

**Service Worker Lifecycle**:
- Deploy new version with updated cache version
- Verify old cache is cleared
- Verify new assets are cached

**Performance**:
- Test camera data fetch on throttled LTE connection
- Verify total load time < 10 seconds

### Test Coverage Goals

- **Unit tests**: 80%+ code coverage for business logic (CameraService, GeolocationService, FilterController)
- **Property tests**: 100% coverage of identified correctness properties
- **Integration tests**: Critical user paths (install, offline, filter interaction)
- **Manual tests**: iOS-specific PWA behavior, touch gestures, visual appearance

---

## Implementation Notes

### PWA Manifest (manifest.json)

Based on research, iOS Safari requires specific manifest fields and meta tags for proper PWA installation:

```json
{
  "name": "Traffic Camera Finder",
  "short_name": "Camera Finder",
  "start_url": "/traffic-camera-finder/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1976d2",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**iOS-Specific Meta Tags** (in `<head>`):
```html
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Camera Finder">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
```

**Icon Requirements**:
- `apple-touch-icon`: 180×180px PNG (no transparency, square with no padding)
- Manifest icons: 192×192px and 512×512px (for Android compatibility)

### Service Worker Cache Strategy

**App Shell** (cache-first):
- HTML, CSS, JavaScript files
- Leaflet library and CSS
- Icons and images
- Cached on install, updated on activate

**Map Tiles** (network-first with cache fallback):
- OpenStreetMap tiles
- Cache successful tile loads
- Fall back to cache if offline
- Implement cache size limit (e.g., 50MB) with LRU eviction

**API Requests** (network-only):
- Camera data API
- Handled by application logic (not service worker)
- Uses localStorage for caching (not Cache API)

### Camera Data API

**Note**: The actual API endpoint and response format are not specified in requirements. The design assumes a RESTful JSON API. Implementation will need to:

1. Identify the actual data source (e.g., DataSF Open Data Portal, 511.org API)
2. Implement appropriate API client with authentication if required
3. Add response parsing adapter if format differs from assumed schema

**Research findings**: Oakland and San Francisco have speed camera pilot programs, but public APIs for camera locations were not found in initial research. Implementation may need to:
- Use static JSON file with manually curated camera locations
- Scrape data from city websites (if permitted)
- Use a third-party data aggregator
- Contact city transportation departments for official data feeds

### Deployment

**Hosting**: GitHub Pages

The app will be deployed to GitHub Pages and accessible at:
```
https://{username}.github.io/traffic-camera-finder
```

This makes the app always live and reachable from any device on LTE — no local server or computer required.

**GitHub Pages provides HTTPS automatically**, which is a hard requirement for both the Service Worker API and the browser Geolocation API. Without HTTPS, neither will function.

**`start_url` in manifest.json must match the GitHub Pages subdirectory path**. Since GitHub Pages serves the app under a subdirectory (not the root), the manifest must reflect this:

```json
{
  "start_url": "/traffic-camera-finder/",
  ...
}
```

If `start_url` is left as `"/"`, iOS Safari will fail to resolve the correct entry point when launching from the home screen in standalone mode.

**Build Process** (optional):
- Minify HTML, CSS, JavaScript
- Optimize images
- Generate cache-busting filenames
- Bundle dependencies (or use CDN for Leaflet)

---

## Open Questions

1. **Camera Data Source**: What is the actual API endpoint or data source for Oakland and San Francisco camera locations?
   - **Impact**: High - core functionality depends on this
   - **Resolution**: Research city open data portals, contact transportation departments, or use static data file

2. **Camera Data Update Frequency**: How often do camera locations change in reality?
   - **Impact**: Medium - affects cache staleness threshold (currently 7 days)
   - **Resolution**: Validate 7-day threshold with domain knowledge or adjust based on data source update frequency

3. **API Rate Limiting**: Does the camera data API have rate limits or require authentication?
   - **Impact**: Medium - may need to implement rate limiting or API key management
   - **Resolution**: Review API documentation once data source is identified

4. **Camera Type Taxonomy**: What are all possible camera types beyond "Speed Camera" and "Red Light Camera"?
   - **Impact**: Low - affects data model and UI display
   - **Resolution**: Review actual data source schema

5. **Offline Map Tiles**: Should the app pre-cache map tiles for Oakland/SF for offline use?
   - **Impact**: Medium - improves offline experience but increases cache size
   - **Resolution**: Implement if cache size is acceptable (<50MB), otherwise rely on network-first strategy

---

## References

**PWA and iOS Safari**:
- [PWA iOS Limitations and Safari Support](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide) - Overview of iOS PWA capabilities and limitations
- [iOS PWA Compatibility](https://firt.dev/notes/pwa-ios/) - Comprehensive compatibility matrix for Safari on iOS
- Content rephrased for compliance with licensing restrictions

**Mapping Libraries**:
- [Leaflet Documentation](https://leafletjs.com/) - Official Leaflet API documentation
- [Leaflet vs MapLibre GL vs OpenLayers](https://www.geoapify.com/map-libraries-comparison-leaflet-vs-mapbox-gl-vs-openlayers-trends-and-statistics/) - Comparison of mapping libraries
- Content rephrased for compliance with licensing restrictions

**Storage APIs**:
- [IndexedDB vs localStorage](https://www.frontendtools.tech/blog/client-side-storage-guide-localstorage-sessionstorage-indexeddb) - Comparison of browser storage options
- Content rephrased for compliance with licensing restrictions

**Data Sources**:
- [DataSF Open Data Portal](https://datasf.org/opendata/) - San Francisco open data
- [Oakland Speed Safety Cameras](https://www.oaklandca.gov/Public-Safety-Streets/Traffic-Safety/Speed-Safety-Cameras-Pilot-Program) - Oakland camera program information
- [511.org Traffic Data](https://511.org/open-data/traffic) - Bay Area traffic data API
