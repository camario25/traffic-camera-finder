/**
 * MapView - Handles interactive map rendering with Leaflet
 * 
 * Responsibilities:
 * - Initialize Leaflet map with OpenStreetMap tiles
 * - Configure map for touch gestures (pinch-to-zoom, pan)
 * - Set initial zoom level to show Oakland and SF area
 * - Render camera markers and user position marker
 * - Handle marker popups and filtering
 */

class MapView {
  constructor() {
    this.map = null;
    this.cameraMarkers = [];
    this.userMarker = null;
  }

  /**
   * Initialize Leaflet map instance
   * @param {HTMLElement|string} container - DOM element or element ID for map container
   * @param {{lat: number, lng: number}} center - Initial center coordinates
   */
  init(container, center) {
    // Create Leaflet map instance
    // Zoom level 14 for closer view of user location
    this.map = L.map(container, {
      center: [center.lat, center.lng],
      zoom: 14,
      // Touch gesture configuration (enabled by default in Leaflet)
      touchZoom: true,
      dragging: true,
      tap: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      boxZoom: true
    });

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      minZoom: 9
    }).addTo(this.map);
  }

  /**
   * Create custom pin icon for speed camera markers (orange with speedometer)
   * @returns {L.Icon} Leaflet icon instance
   * @private
   */
  _createSpeedCameraIcon() {
    return L.icon({
      iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
          <path fill="#f97316" stroke="#c2410c" stroke-width="1.5" d="M16 0C9.373 0 4 5.373 4 12c0 9 12 28 12 28s12-19 12-28c0-6.627-5.373-12-12-12z"/>
          <circle cx="16" cy="12" r="6" fill="#ffffff"/>
          <path fill="#f97316" d="M16 7.5 A4.5 4.5 0 0 1 20.5 12 L16 12 Z" transform="rotate(-45 16 12)"/>
          <circle cx="16" cy="12" r="1" fill="#c2410c"/>
          <line x1="16" y1="12" x2="18.5" y2="9.5" stroke="#c2410c" stroke-width="0.8"/>
        </svg>
      `),
      iconSize: [32, 40],
      iconAnchor: [16, 40],
      popupAnchor: [0, -40]
    });
  }

  /**
   * Create custom pin icon for red light camera markers (red with traffic light)
   * @returns {L.Icon} Leaflet icon instance
   * @private
   */
  _createRedLightCameraIcon() {
    return L.icon({
      iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
          <path fill="#dc2626" stroke="#991b1b" stroke-width="1.5" d="M16 0C9.373 0 4 5.373 4 12c0 9 12 28 12 28s12-19 12-28c0-6.627-5.373-12-12-12z"/>
          <rect x="13" y="7" width="6" height="10" rx="1" fill="#ffffff"/>
          <circle cx="16" cy="9" r="1.2" fill="#dc2626"/>
          <circle cx="16" cy="12" r="1.2" fill="#eab308"/>
          <circle cx="16" cy="15" r="1.2" fill="#22c55e"/>
        </svg>
      `),
      iconSize: [32, 40],
      iconAnchor: [16, 40],
      popupAnchor: [0, -40]
    });
  }

  /**
   * Filter cameras by city
   * @param {Camera[]} cameras - Array of all camera objects
   * @param {string} cityFilter - 'all', 'oakland', or 'san-francisco'
   * @returns {Camera[]} Filtered array of cameras
   * @private
   */
  _filterCamerasByCity(cameras, cityFilter) {
    if (cityFilter === 'all') {
      return cameras;
    }
    
    // Normalize filter to match city names in data
    const cityName = cityFilter === 'oakland' ? 'Oakland' : 'San Francisco';
    
    return cameras.filter(camera => camera.city === cityName);
  }

  /**
   * Render camera markers on the map
   * @param {Camera[]} cameras - Array of camera objects
   * @param {string} cityFilter - 'all', 'oakland', or 'san-francisco'
   */
  renderCameraMarkers(cameras, cityFilter) {
    // Clear existing camera markers first
    this.clearCameraMarkers();
    
    // Filter cameras by city
    const filteredCameras = this._filterCamerasByCity(cameras, cityFilter);
    
    // Add marker for each filtered camera
    filteredCameras.forEach(camera => {
      // Choose icon based on camera type
      const icon = camera.type === 'Red Light Camera' 
        ? this._createRedLightCameraIcon() 
        : this._createSpeedCameraIcon();
      
      const marker = L.marker([camera.lat, camera.lng], {
        icon: icon
      }).addTo(this.map);
      
      // Bind popup to marker
      this.showCameraPopup(camera, marker);
      
      // Store marker reference for later clearing
      this.cameraMarkers.push(marker);
    });
  }

  /**
   * Clear all camera markers from the map
   */
  clearCameraMarkers() {
    this.cameraMarkers.forEach(marker => {
      this.map.removeLayer(marker);
    });
    this.cameraMarkers = [];
  }

  /**
   * Create custom blue circle icon with pulsing animation for user position
   * @returns {L.DivIcon} Leaflet div icon instance
   * @private
   */
  _createUserIcon() {
    return L.divIcon({
      className: 'user-position-marker',
      html: '<div class="user-marker-pulse"></div><div class="user-marker-dot"></div>',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
  }

  /**
   * Render user position marker on the map
   * @param {{lat: number, lng: number}} position - User's current position
   */
  renderUserMarker(position) {
    // Remove existing user marker if present
    if (this.userMarker) {
      this.map.removeLayer(this.userMarker);
    }

    // Create custom blue circle icon with pulsing animation
    const userIcon = this._createUserIcon();

    // Add user marker to map
    this.userMarker = L.marker([position.lat, position.lng], {
      icon: userIcon,
      zIndexOffset: 1000 // Ensure user marker appears above camera markers
    }).addTo(this.map);
  }

  /**
   * Update user position marker location (for real-time tracking)
   * @param {{lat: number, lng: number}} position - User's new position
   */
  updateUserMarker(position) {
    if (this.userMarker) {
      // Update existing marker position
      this.userMarker.setLatLng([position.lat, position.lng]);
    } else {
      // Create marker if it doesn't exist
      this.renderUserMarker(position);
    }
  }

  /**
   * Display camera information popup on marker
   * @param {Camera} camera - Camera object with city and type information
   * @param {L.Marker} marker - Leaflet marker to bind popup to
   */
  showCameraPopup(camera, marker) {
    // Format popup content with city, type, and address
    let popupContent = `<strong>${camera.city} - ${camera.type}</strong>`;
    
    // Add address if available
    if (camera.location) {
      popupContent += `<br>${camera.location}`;
    }
    
    // Bind popup to marker
    marker.bindPopup(popupContent);
  }
}

export default MapView;
