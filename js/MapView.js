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
   * Create custom red pin icon for camera markers
   * @returns {L.Icon} Leaflet icon instance
   * @private
   */
  _createCameraIcon() {
    return L.icon({
      iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
          <path fill="#dc2626" stroke="#991b1b" stroke-width="1.5" d="M16 0C9.373 0 4 5.373 4 12c0 9 12 28 12 28s12-19 12-28c0-6.627-5.373-12-12-12z"/>
          <circle cx="16" cy="12" r="6" fill="#ffffff"/>
          <path fill="#dc2626" d="M16 8l-3 2v4h6v-4z"/>
          <circle cx="16" cy="10" r="1.5" fill="#ffffff"/>
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
    
    // Create custom icon for camera markers
    const cameraIcon = this._createCameraIcon();
    
    // Add marker for each filtered camera
    filteredCameras.forEach(camera => {
      const marker = L.marker([camera.lat, camera.lng], {
        icon: cameraIcon
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
