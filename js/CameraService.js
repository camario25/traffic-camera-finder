/**
 * CameraService - Handles fetching, caching, and retrieving camera data
 * 
 * Responsibilities:
 * - Check cache freshness (7-day threshold)
 * - Load camera data from localStorage
 * - Store camera data with timestamp in localStorage
 * - Handle localStorage errors gracefully
 */

const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const CACHE_KEY_DATA = 'cameraData';
const CACHE_KEY_TIMESTAMP = 'cameraDataTimestamp';

class CameraService {
  /**
   * Check if cached data exists and is less than 7 days old
   * @returns {boolean} True if cache is fresh, false otherwise
   */
  isCacheFresh() {
    try {
      const timestamp = localStorage.getItem(CACHE_KEY_TIMESTAMP);
      if (!timestamp) {
        return false;
      }
      
      const age = Date.now() - parseInt(timestamp, 10);
      return age < CACHE_MAX_AGE_MS;
    } catch (error) {
      // localStorage unavailable (private browsing, etc.)
      console.warn('Unable to access localStorage:', error);
      return false;
    }
  }

  /**
   * Load camera data from localStorage
   * @returns {Camera[] | null} Array of camera objects, or null if not available
   */
  getCachedCameras() {
    try {
      const cachedData = localStorage.getItem(CACHE_KEY_DATA);
      if (!cachedData) {
        return null;
      }
      
      return JSON.parse(cachedData);
    } catch (error) {
      // Handle JSON parse errors or localStorage unavailable
      console.warn('Unable to load cached cameras:', error);
      return null;
    }
  }

  /**
   * Store camera data with timestamp in localStorage
   * @param {Camera[]} cameras - Array of camera objects to cache
   */
  setCachedCameras(cameras) {
    try {
      const dataString = JSON.stringify(cameras);
      const timestamp = Date.now().toString();
      
      localStorage.setItem(CACHE_KEY_DATA, dataString);
      localStorage.setItem(CACHE_KEY_TIMESTAMP, timestamp);
    } catch (error) {
      // Handle quota exceeded or localStorage unavailable
      if (error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded. Unable to cache camera data.');
      } else {
        console.warn('Unable to cache cameras:', error);
      }
      // Continue without caching - app will fetch fresh data each time
    }
  }

  /**
   * Parse API response to Camera model format
   * Converts API format to internal Camera model
   * @param {Object[]} apiData - Raw API response data
   * @returns {Camera[]} Array of parsed camera objects
   * @private
   */
  _parseAPIResponse(apiData) {
    if (!Array.isArray(apiData)) {
      throw new Error('API response must be an array');
    }

    return apiData.map(item => {
      // Map camera_type to display format
      let type = item.camera_type;
      if (type === 'speed') {
        type = 'Speed Camera';
      } else if (type === 'red_light') {
        type = 'Red Light Camera';
      }

      return {
        id: item.id,
        lat: item.latitude,
        lng: item.longitude,
        city: item.city,
        type: type,
        location: item.address
      };
    });
  }

  /**
   * Get camera data using cache-first strategy
   * Main public method that orchestrates cache checking and API fetching
   * 
   * Flow:
   * 1. Check if cache is fresh
   * 2. If fresh, return cached data
   * 3. If not fresh, fetch from API
   * 4. Store fetched data in cache
   * 5. If API fetch fails and stale cache exists, use stale cache
   * 6. If API fetch fails and no cache exists, throw error
   * 
   * @returns {Promise<Camera[]>} Array of camera objects
   * @throws {Error} If API fetch fails and no cache is available
   */
  async getCameras() {
    // Check cache freshness first
    if (this.isCacheFresh()) {
      const cachedCameras = this.getCachedCameras();
      if (cachedCameras) {
        return cachedCameras;
      }
    }

    // Cache is stale or doesn't exist - try to fetch from API
    try {
      const cameras = await this.fetchCamerasFromAPI();
      
      // Store fetched data in cache with timestamp
      this.setCachedCameras(cameras);
      
      return cameras;
    } catch (error) {
      // API fetch failed - check if we have stale cache to fall back to
      const staleCachedCameras = this.getCachedCameras();
      
      if (staleCachedCameras) {
        // Return stale cache data
        console.warn('API fetch failed, using stale cached data:', error.message);
        return staleCachedCameras;
      }
      
      // No cache available - throw error
      throw new Error(`Unable to load camera data: ${error.message}`);
    }
  }

  /**
   * Fetch camera data from external API
   * @returns {Promise<Camera[]>} Array of camera objects
   * @throws {Error} If network request fails, times out, or returns invalid JSON
   */
  async fetchCamerasFromAPI() {
    // TODO: Replace with actual API endpoint once determined
    // For now, using a placeholder that will be replaced with real data source
    const API_ENDPOINT = '/api/cameras.json';
    const TIMEOUT_MS = 10000; // 10 second timeout per requirement 2.8

    try {
      // Create abort controller for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(API_ENDPOINT, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      // Check if response is OK (status 200-299)
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      // Parse JSON response
      const data = await response.json();

      // Parse API format to Camera model
      const cameras = this._parseAPIResponse(data);

      return cameras;

    } catch (error) {
      // Handle different error types
      if (error.name === 'AbortError') {
        throw new Error('API request timed out after 10 seconds');
      } else if (error instanceof SyntaxError) {
        // JSON parsing error
        throw new Error('API returned invalid JSON');
      } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('Network error: Unable to reach camera data API');
      } else {
        // Re-throw other errors (including our custom errors)
        throw error;
      }
    }
  }
}

export default CameraService;
