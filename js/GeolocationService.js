/**
 * GeolocationService - Handles user location detection
 * 
 * Responsibilities:
 * - Request user's current position using browser Geolocation API
 * - Provide default center coordinates (San Francisco)
 * - Handle geolocation errors gracefully
 */

// Default center: San Francisco geographic center
const DEFAULT_CENTER = {
  lat: 37.7749,
  lng: -122.4194
};

class GeolocationService {
  constructor() {
    this.watchId = null;
  }

  /**
   * Get default center coordinates (San Francisco geographic center)
   * @returns {{lat: number, lng: number}} Default center coordinates
   */
  getDefaultCenter() {
    return { ...DEFAULT_CENTER };
  }

  /**
   * Request user's current position using browser Geolocation API
   * Falls back to default center on any error
   * 
   * @returns {Promise<{lat: number, lng: number}>} User's coordinates or default center
   */
  async getUserLocation() {
    // Check if Geolocation API is available
    if (!navigator.geolocation) {
      console.warn('Geolocation API not available');
      return this.getDefaultCenter();
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        // Success callback
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        // Error callback
        (error) => {
          // Handle different geolocation error codes
          switch (error.code) {
            case error.PERMISSION_DENIED:
              console.warn('Geolocation permission denied by user');
              break;
            case error.POSITION_UNAVAILABLE:
              console.warn('Geolocation position unavailable');
              break;
            case error.TIMEOUT:
              console.warn('Geolocation request timed out');
              break;
            default:
              console.warn('Unknown geolocation error:', error.message);
              break;
          }
          
          // Return default center on any error
          resolve(this.getDefaultCenter());
        },
        // Options
        {
          enableHighAccuracy: false,
          timeout: 10000, // 10 second timeout
          maximumAge: 300000 // Accept cached position up to 5 minutes old
        }
      );
    });
  }

  /**
   * Start watching user's position in real-time
   * Calls the callback function whenever the position changes
   * 
   * @param {Function} onPositionUpdate - Callback function that receives {lat, lng} on position updates
   * @param {Function} onError - Optional callback for handling errors
   */
  startWatchingPosition(onPositionUpdate, onError = null) {
    // Check if Geolocation API is available
    if (!navigator.geolocation) {
      console.warn('Geolocation API not available');
      if (onError) {
        onError(new Error('Geolocation API not available'));
      }
      return;
    }

    // Stop any existing watch
    this.stopWatchingPosition();

    // Start watching position
    this.watchId = navigator.geolocation.watchPosition(
      // Success callback
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        onPositionUpdate(coords);
      },
      // Error callback
      (error) => {
        // Handle different geolocation error codes
        switch (error.code) {
          case error.PERMISSION_DENIED:
            console.warn('Geolocation permission denied by user');
            break;
          case error.POSITION_UNAVAILABLE:
            console.warn('Geolocation position unavailable');
            break;
          case error.TIMEOUT:
            console.warn('Geolocation request timed out');
            break;
          default:
            console.warn('Unknown geolocation error:', error.message);
            break;
        }
        
        if (onError) {
          onError(error);
        }
      },
      // Options
      {
        enableHighAccuracy: true, // Use GPS for better accuracy when tracking movement
        timeout: 10000, // 10 second timeout
        maximumAge: 0 // Don't use cached position for real-time tracking
      }
    );
  }

  /**
   * Stop watching user's position
   */
  stopWatchingPosition() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }
}

export default GeolocationService;
