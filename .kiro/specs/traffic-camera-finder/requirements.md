# Requirements Document

## Introduction

A Progressive Web App (PWA) that locates and displays traffic enforcement cameras (speed cameras and red-light cameras) in Oakland and San Francisco. The app runs entirely on-device (no hosting required), is installable on iPhone via Safari's "Add to Home Screen", and makes live API calls each time it is opened to fetch current camera data. Users can see cameras on a map relative to their current location.

## Glossary

- **App**: The traffic-camera-finder Progressive Web App
- **Camera**: A fixed speed or red-light enforcement camera at a known geographic location
- **Camera_Feed**: The live data source (external API or open dataset) that provides current camera locations
- **Geolocation_Service**: The browser's built-in Geolocation API used to determine the user's current position
- **Map_View**: The interactive map component that renders camera markers and the user's position
- **Service_Worker**: The background script that enables PWA offline shell caching and installability
- **Manifest**: The Web App Manifest JSON file that enables "Add to Home Screen" on iOS Safari

---

## Requirements

### Requirement 1: PWA Installability on iOS Safari

**User Story:** As an iPhone user, I want to add the app to my home screen, so that it launches like a native app without needing a browser URL bar.

#### Acceptance Criteria

1. THE App SHALL include a Web App Manifest with `name`, `short_name`, `start_url`, `display: standalone`, `background_color`, `theme_color`, and at least one icon sized 192×192 or larger.
2. THE App SHALL include a Service_Worker registered on first load that caches the app shell (HTML, CSS, JS, icons).
3. WHEN a user opens the App from the iOS home screen, THE App SHALL launch in standalone display mode without the Safari navigation bar.
4. THE App SHALL include an Apple-specific `apple-touch-icon` meta tag so iOS renders a proper home screen icon.

---

### Requirement 2: Camera Data Fetching with Caching

**User Story:** As a user, I want the app to cache camera data locally and only fetch fresh data when needed, so that the app loads quickly and doesn't waste bandwidth on data that rarely changes.

#### Acceptance Criteria

1. WHEN the App is opened, THE App SHALL check for cached camera data in local storage (localStorage or IndexedDB).
2. WHEN cached camera data exists and is less than 7 days old, THE App SHALL load camera data from the cache without making a network request.
3. WHEN cached camera data is missing or older than 7 days, THE App SHALL request the Camera_Feed from the live data source for Oakland and San Francisco.
4. WHEN the Camera_Feed request succeeds, THE App SHALL parse the response into a list of Camera objects each containing at minimum: latitude, longitude, city, and camera type.
5. WHEN the Camera_Feed request succeeds, THE App SHALL store the fetched camera data and the current timestamp in local storage for future cache hits.
6. WHEN the Camera_Feed request fails and cached data exists (even if stale), THE App SHALL load the cached data and display a notice that data may be outdated.
7. WHEN the Camera_Feed request fails and no cached data exists, THE App SHALL display a descriptive error message indicating the data could not be loaded.
8. THE App SHALL complete the Camera_Feed fetch and render results within 10 seconds on a standard LTE connection.
9. FOR ALL valid Camera_Feed responses, parsing then re-serializing then parsing SHALL produce an equivalent list of Camera objects (round-trip property).

---

### Requirement 3: User Location Detection

**User Story:** As a user, I want the app to detect my current location, so that I can see cameras near me.

#### Acceptance Criteria

1. WHEN the App loads, THE Geolocation_Service SHALL request the user's current position using the browser Geolocation API.
2. WHEN the user grants location permission, THE App SHALL center the Map_View on the user's current coordinates.
3. IF the user denies location permission, THEN THE App SHALL display the Map_View centered on a default location (geographic center of San Francisco) and show a notice that location access was denied.
4. IF the Geolocation_Service returns an error, THEN THE App SHALL display a descriptive error message and fall back to the default center location.
5. WHILE location detection is in progress, THE App SHALL display a loading indicator.

---

### Requirement 4: Camera Map Display

**User Story:** As a user, I want to see traffic enforcement cameras plotted on a map, so that I can identify their locations relative to where I am.

#### Acceptance Criteria

1. WHEN Camera objects are available, THE Map_View SHALL render a distinct marker for each Camera at its latitude/longitude coordinates.
2. THE Map_View SHALL visually distinguish the user's current position from Camera markers using a different icon or color.
3. WHEN a user taps a Camera marker, THE Map_View SHALL display a popup containing the camera's city and camera type.
4. THE Map_View SHALL support pinch-to-zoom and pan gestures on touch devices.
5. THE Map_View SHALL render all Camera markers within the visible Oakland and San Francisco bounding box without requiring the user to scroll outside the initial viewport.

---

### Requirement 5: City Filtering

**User Story:** As a user, I want to filter cameras by city, so that I can focus on Oakland or San Francisco independently.

#### Acceptance Criteria

1. THE App SHALL provide a filter control with options: "All", "Oakland", and "San Francisco".
2. WHEN the user selects "Oakland", THE Map_View SHALL display only Camera markers where city equals "Oakland".
3. WHEN the user selects "San Francisco", THE Map_View SHALL display only Camera markers where city equals "San Francisco".
4. WHEN the user selects "All", THE Map_View SHALL display Camera markers for both cities.
5. WHEN the active filter changes, THE Map_View SHALL update the visible markers without reloading camera data from the network.

---

### Requirement 6: Offline App Shell

**User Story:** As a user, I want the app UI to load even without a network connection, so that I can at least open the app and see a meaningful state.

#### Acceptance Criteria

1. WHILE the device has no network connectivity, THE Service_Worker SHALL serve the cached app shell so the App loads without a network request.
2. WHILE the device has no network connectivity and the App attempts a Camera_Feed fetch, THE App SHALL display a message indicating that live camera data is unavailable offline.
3. THE Service_Worker SHALL cache app shell assets on first install and update the cache when a new version of the App is deployed.
