/**
 * Unit tests for MapView
 * 
 * Tests:
 * - Map initialization with specific center coordinates
 * - Initial map bounds include Oakland and SF
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import MapView from './MapView.js';

// Mock Leaflet globally
global.L = {
  map: vi.fn((container, options) => {
    const mockMap = {
      _container: container,
      _center: options.center,
      _zoom: options.zoom,
      _options: options,
      _layers: [],
      setView: vi.fn(),
      getCenter: vi.fn(() => ({ lat: options.center[0], lng: options.center[1] })),
      getZoom: vi.fn(() => options.zoom),
      getBounds: vi.fn(() => ({
        contains: vi.fn(() => true)
      })),
      removeLayer: vi.fn(function(layer) {
        const index = this._layers.indexOf(layer);
        if (index > -1) {
          this._layers.splice(index, 1);
        }
      })
    };
    return mockMap;
  }),
  tileLayer: vi.fn(() => ({
    addTo: vi.fn()
  })),
  marker: vi.fn((latlng, options) => {
    const mockMarker = {
      _latlng: latlng,
      _icon: options?.icon,
      _popup: null,
      addTo: vi.fn(function(map) {
        map._layers.push(this);
        return this;
      }),
      bindPopup: vi.fn(function(content) {
        this._popup = content;
        return this;
      })
    };
    return mockMarker;
  }),
  icon: vi.fn((options) => ({
    options: options
  })),
  divIcon: vi.fn((options) => ({
    options: options
  }))
};

describe('MapView', () => {
  let mapView;
  let container;

  beforeEach(() => {
    // Create a mock container element
    container = document.createElement('div');
    container.id = 'test-map';
    document.body.appendChild(container);
    
    mapView = new MapView();
  });

  afterEach(() => {
    // Clean up
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('init', () => {
    it('should initialize map with provided center coordinates', () => {
      const center = { lat: 37.7749, lng: -122.4194 };
      
      mapView.init(container, center);
      
      expect(global.L.map).toHaveBeenCalledWith(
        container,
        expect.objectContaining({
          center: [center.lat, center.lng],
          zoom: 11
        })
      );
    });

    it('should initialize map with Oakland coordinates', () => {
      const center = { lat: 37.8044, lng: -122.2712 };
      
      mapView.init(container, center);
      
      expect(global.L.map).toHaveBeenCalledWith(
        container,
        expect.objectContaining({
          center: [center.lat, center.lng]
        })
      );
    });

    it('should set zoom level to show Oakland and SF area (zoom 11)', () => {
      const center = { lat: 37.7749, lng: -122.4194 };
      
      mapView.init(container, center);
      
      expect(global.L.map).toHaveBeenCalledWith(
        container,
        expect.objectContaining({
          zoom: 11
        })
      );
    });

    it('should configure map for touch gestures', () => {
      const center = { lat: 37.7749, lng: -122.4194 };
      
      mapView.init(container, center);
      
      expect(global.L.map).toHaveBeenCalledWith(
        container,
        expect.objectContaining({
          touchZoom: true,
          dragging: true,
          tap: true,
          scrollWheelZoom: true,
          doubleClickZoom: true,
          boxZoom: true
        })
      );
    });

    it('should add OpenStreetMap tile layer', () => {
      const center = { lat: 37.7749, lng: -122.4194 };
      
      mapView.init(container, center);
      
      expect(global.L.tileLayer).toHaveBeenCalledWith(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        expect.objectContaining({
          maxZoom: 19,
          minZoom: 9
        })
      );
    });

    it('should store map instance', () => {
      const center = { lat: 37.7749, lng: -122.4194 };
      
      mapView.init(container, center);
      
      expect(mapView.map).toBeDefined();
      expect(mapView.map).not.toBeNull();
    });
  });

  describe('renderCameraMarkers', () => {
    beforeEach(() => {
      const center = { lat: 37.7749, lng: -122.4194 };
      mapView.init(container, center);
      // Clear mock calls from init
      vi.clearAllMocks();
    });

    it('should render markers for all cameras when filter is "all"', () => {
      const cameras = [
        { id: 'oak-001', lat: 37.8044, lng: -122.2712, city: 'Oakland', type: 'Speed Camera' },
        { id: 'sf-001', lat: 37.7749, lng: -122.4194, city: 'San Francisco', type: 'Red Light Camera' }
      ];
      
      mapView.renderCameraMarkers(cameras, 'all');
      
      expect(global.L.marker).toHaveBeenCalledTimes(2);
      expect(global.L.marker).toHaveBeenCalledWith([37.8044, -122.2712], expect.any(Object));
      expect(global.L.marker).toHaveBeenCalledWith([37.7749, -122.4194], expect.any(Object));
    });

    it('should render only Oakland cameras when filter is "oakland"', () => {
      const cameras = [
        { id: 'oak-001', lat: 37.8044, lng: -122.2712, city: 'Oakland', type: 'Speed Camera' },
        { id: 'oak-002', lat: 37.8100, lng: -122.2700, city: 'Oakland', type: 'Red Light Camera' },
        { id: 'sf-001', lat: 37.7749, lng: -122.4194, city: 'San Francisco', type: 'Speed Camera' }
      ];
      
      mapView.renderCameraMarkers(cameras, 'oakland');
      
      expect(global.L.marker).toHaveBeenCalledTimes(2);
      expect(global.L.marker).toHaveBeenCalledWith([37.8044, -122.2712], expect.any(Object));
      expect(global.L.marker).toHaveBeenCalledWith([37.8100, -122.2700], expect.any(Object));
    });

    it('should render only San Francisco cameras when filter is "san-francisco"', () => {
      const cameras = [
        { id: 'oak-001', lat: 37.8044, lng: -122.2712, city: 'Oakland', type: 'Speed Camera' },
        { id: 'sf-001', lat: 37.7749, lng: -122.4194, city: 'San Francisco', type: 'Red Light Camera' },
        { id: 'sf-002', lat: 37.7800, lng: -122.4200, city: 'San Francisco', type: 'Speed Camera' }
      ];
      
      mapView.renderCameraMarkers(cameras, 'san-francisco');
      
      expect(global.L.marker).toHaveBeenCalledTimes(2);
      expect(global.L.marker).toHaveBeenCalledWith([37.7749, -122.4194], expect.any(Object));
      expect(global.L.marker).toHaveBeenCalledWith([37.7800, -122.4200], expect.any(Object));
    });

    it('should create custom red pin icon for camera markers', () => {
      const cameras = [
        { id: 'oak-001', lat: 37.8044, lng: -122.2712, city: 'Oakland', type: 'Speed Camera' }
      ];
      
      mapView.renderCameraMarkers(cameras, 'all');
      
      expect(global.L.icon).toHaveBeenCalled();
      const iconCall = global.L.icon.mock.calls[0][0];
      expect(iconCall.iconUrl).toContain('data:image/svg+xml');
      expect(iconCall.iconSize).toEqual([32, 40]);
      expect(iconCall.iconAnchor).toEqual([16, 40]);
    });

    it('should store marker references in cameraMarkers array', () => {
      const cameras = [
        { id: 'oak-001', lat: 37.8044, lng: -122.2712, city: 'Oakland', type: 'Speed Camera' },
        { id: 'sf-001', lat: 37.7749, lng: -122.4194, city: 'San Francisco', type: 'Red Light Camera' }
      ];
      
      mapView.renderCameraMarkers(cameras, 'all');
      
      expect(mapView.cameraMarkers).toHaveLength(2);
    });

    it('should clear existing markers before rendering new ones', () => {
      const cameras1 = [
        { id: 'oak-001', lat: 37.8044, lng: -122.2712, city: 'Oakland', type: 'Speed Camera' }
      ];
      const cameras2 = [
        { id: 'sf-001', lat: 37.7749, lng: -122.4194, city: 'San Francisco', type: 'Red Light Camera' }
      ];
      
      mapView.renderCameraMarkers(cameras1, 'all');
      expect(mapView.cameraMarkers).toHaveLength(1);
      
      mapView.renderCameraMarkers(cameras2, 'all');
      expect(mapView.cameraMarkers).toHaveLength(1);
      expect(mapView.map.removeLayer).toHaveBeenCalled();
    });

    it('should handle empty camera array', () => {
      mapView.renderCameraMarkers([], 'all');
      
      expect(global.L.marker).not.toHaveBeenCalled();
      expect(mapView.cameraMarkers).toHaveLength(0);
    });
  });

  describe('clearCameraMarkers', () => {
    beforeEach(() => {
      const center = { lat: 37.7749, lng: -122.4194 };
      mapView.init(container, center);
      vi.clearAllMocks();
    });

    it('should remove all camera markers from map', () => {
      const cameras = [
        { id: 'oak-001', lat: 37.8044, lng: -122.2712, city: 'Oakland', type: 'Speed Camera' },
        { id: 'sf-001', lat: 37.7749, lng: -122.4194, city: 'San Francisco', type: 'Red Light Camera' }
      ];
      
      mapView.renderCameraMarkers(cameras, 'all');
      expect(mapView.cameraMarkers).toHaveLength(2);
      
      mapView.clearCameraMarkers();
      
      expect(mapView.map.removeLayer).toHaveBeenCalledTimes(2);
      expect(mapView.cameraMarkers).toHaveLength(0);
    });

    it('should handle clearing when no markers exist', () => {
      mapView.clearCameraMarkers();
      
      expect(mapView.map.removeLayer).not.toHaveBeenCalled();
      expect(mapView.cameraMarkers).toHaveLength(0);
    });
  });

  describe('renderUserMarker', () => {
    beforeEach(() => {
      const center = { lat: 37.7749, lng: -122.4194 };
      mapView.init(container, center);
      vi.clearAllMocks();
    });

    it('should render user marker at provided position', () => {
      const position = { lat: 37.8044, lng: -122.2712 };
      
      mapView.renderUserMarker(position);
      
      expect(global.L.marker).toHaveBeenCalledWith(
        [position.lat, position.lng],
        expect.objectContaining({
          zIndexOffset: 1000
        })
      );
    });

    it('should create custom blue circle icon with pulsing animation', () => {
      const position = { lat: 37.8044, lng: -122.2712 };
      
      mapView.renderUserMarker(position);
      
      expect(global.L.divIcon).toHaveBeenCalled();
      const divIconCall = global.L.divIcon.mock.calls[0][0];
      expect(divIconCall.className).toBe('user-position-marker');
      expect(divIconCall.html).toContain('user-marker-pulse');
      expect(divIconCall.html).toContain('user-marker-dot');
      expect(divIconCall.iconSize).toEqual([40, 40]);
      expect(divIconCall.iconAnchor).toEqual([20, 20]);
    });

    it('should store user marker reference', () => {
      const position = { lat: 37.8044, lng: -122.2712 };
      
      mapView.renderUserMarker(position);
      
      expect(mapView.userMarker).toBeDefined();
      expect(mapView.userMarker).not.toBeNull();
    });

    it('should remove existing user marker before adding new one', () => {
      const position1 = { lat: 37.8044, lng: -122.2712 };
      const position2 = { lat: 37.7749, lng: -122.4194 };
      
      mapView.renderUserMarker(position1);
      const firstMarker = mapView.userMarker;
      
      mapView.renderUserMarker(position2);
      
      expect(mapView.map.removeLayer).toHaveBeenCalledWith(firstMarker);
      expect(mapView.userMarker).not.toBe(firstMarker);
    });

    it('should set zIndexOffset to ensure user marker appears above camera markers', () => {
      const position = { lat: 37.8044, lng: -122.2712 };
      
      mapView.renderUserMarker(position);
      
      expect(global.L.marker).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          zIndexOffset: 1000
        })
      );
    });

    it('should handle rendering user marker when no previous marker exists', () => {
      const position = { lat: 37.8044, lng: -122.2712 };
      
      expect(mapView.userMarker).toBeNull();
      
      mapView.renderUserMarker(position);
      
      expect(mapView.userMarker).toBeDefined();
      expect(mapView.map.removeLayer).not.toHaveBeenCalled();
    });
  });

  describe('showCameraPopup', () => {
    beforeEach(() => {
      const center = { lat: 37.7749, lng: -122.4194 };
      mapView.init(container, center);
      vi.clearAllMocks();
    });

    it('should bind popup with city and type to marker', () => {
      const camera = {
        id: 'oak-001',
        lat: 37.8044,
        lng: -122.2712,
        city: 'Oakland',
        type: 'Speed Camera'
      };
      const mockMarker = {
        bindPopup: vi.fn()
      };
      
      mapView.showCameraPopup(camera, mockMarker);
      
      expect(mockMarker.bindPopup).toHaveBeenCalledWith('Oakland - Speed Camera');
    });

    it('should format popup content correctly for San Francisco camera', () => {
      const camera = {
        id: 'sf-001',
        lat: 37.7749,
        lng: -122.4194,
        city: 'San Francisco',
        type: 'Red Light Camera'
      };
      const mockMarker = {
        bindPopup: vi.fn()
      };
      
      mapView.showCameraPopup(camera, mockMarker);
      
      expect(mockMarker.bindPopup).toHaveBeenCalledWith('San Francisco - Red Light Camera');
    });

    it('should be called when rendering camera markers', () => {
      const cameras = [
        { id: 'oak-001', lat: 37.8044, lng: -122.2712, city: 'Oakland', type: 'Speed Camera' },
        { id: 'sf-001', lat: 37.7749, lng: -122.4194, city: 'San Francisco', type: 'Red Light Camera' }
      ];
      
      mapView.renderCameraMarkers(cameras, 'all');
      
      // Verify bindPopup was called on each marker
      const markerCalls = global.L.marker.mock.results;
      expect(markerCalls[0].value.bindPopup).toHaveBeenCalledWith('Oakland - Speed Camera');
      expect(markerCalls[1].value.bindPopup).toHaveBeenCalledWith('San Francisco - Red Light Camera');
    });
  });
});
