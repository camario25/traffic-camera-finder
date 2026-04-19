/**
 * Main Application Entry Point
 * 
 * Orchestrates initialization of all services and components:
 * - StatusDisplay for user feedback
 * - GeolocationService for user positioning
 * - CameraService for camera data
 * - MapView for map rendering
 * - FilterController for city filtering
 */

import { StatusDisplay } from './StatusDisplay.js';
import GeolocationService from './GeolocationService.js';
import CameraService from './CameraService.js';
import MapView from './MapView.js';
import FilterController from './FilterController.js';

// Global state
let cameras = [];
let userLocation = null;

// Service instances
const statusDisplay = new StatusDisplay('status');
const geolocationService = new GeolocationService();
const cameraService = new CameraService();
const mapView = new MapView();
const filterController = new FilterController();

/**
 * Handle position updates from real-time GPS tracking
 * @param {{lat: number, lng: number}} position - Updated user position
 */
function handlePositionUpdate(position) {
  userLocation = position;
  
  // Update user marker on map
  mapView.updateUserMarker(position);
  
  console.log('Position updated:', position);
}

/**
 * Handle filter change events
 * Re-renders camera markers with new filter without making network requests
 * @param {string} filter - 'all', 'oakland', or 'san-francisco'
 */
function handleFilterChange(filter) {
  // Clear existing camera markers
  mapView.clearCameraMarkers();
  
  // Re-render camera markers with new filter
  mapView.renderCameraMarkers(cameras, filter);
}

/**
 * Initialize the application
 * Main orchestration function that coordinates all services
 */
async function initApp() {
  try {
    // Show loading indicator
    statusDisplay.showLoading('Loading camera data...');

    // Request user location (non-blocking, falls back to default on error)
    userLocation = await geolocationService.getUserLocation();
    
    // Check if we got actual user location or default fallback
    const defaultCenter = geolocationService.getDefaultCenter();
    const isDefaultLocation = (
      userLocation.lat === defaultCenter.lat && 
      userLocation.lng === defaultCenter.lng
    );
    
    // If using default location, show notice (but don't block initialization)
    if (isDefaultLocation) {
      statusDisplay.showNotice('Using default location. Enable location access for personalized view.');
    }

    // Fetch camera data
    try {
      cameras = await cameraService.getCameras();
      
      // Hide status message after successful load
      statusDisplay.hide();
    } catch (error) {
      // Handle camera fetch errors
      statusDisplay.showError(`Unable to load camera data: ${error.message}`);
      console.error('Camera fetch error:', error);
      
      // Don't proceed with map initialization if no camera data
      return;
    }

    // Initialize map with user location or default center
    mapView.init('map', userLocation);

    // Render user position marker
    mapView.renderUserMarker(userLocation);

    // Initialize filter controller with change handler
    const filterContainer = document.getElementById('filter-controls');
    filterController.init(filterContainer, handleFilterChange);

    // Render initial camera markers with active filter
    const activeFilter = filterController.getActiveFilter();
    mapView.renderCameraMarkers(cameras, activeFilter);

    // Start watching user position for real-time tracking
    geolocationService.startWatchingPosition(
      handlePositionUpdate,
      (error) => {
        console.warn('Position tracking error:', error);
        // Continue showing the app even if tracking fails
      }
    );

  } catch (error) {
    // Catch any unexpected errors during initialization
    statusDisplay.showError('Application initialization failed. Please refresh the page.');
    console.error('App initialization error:', error);
  }
}

/**
 * Register Service Worker for PWA functionality
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered successfully:', registration.scope);
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  } else {
    console.log('Service Worker not supported in this browser');
  }
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    registerServiceWorker();
    initApp();
  });
} else {
  // DOM already loaded
  registerServiceWorker();
  initApp();
}
