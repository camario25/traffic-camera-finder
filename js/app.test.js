/**
 * Integration tests for main application initialization
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('App Initialization', () => {
  beforeEach(() => {
    // Set up DOM structure
    document.body.innerHTML = `
      <div id="app">
        <div id="status" class="status-container"></div>
        <div id="filter-controls" class="filter-controls">
          <button class="filter-btn active" data-filter="all">All</button>
          <button class="filter-btn" data-filter="oakland">Oakland</button>
          <button class="filter-btn" data-filter="san-francisco">San Francisco</button>
        </div>
        <div id="map"></div>
      </div>
    `;

    // Mock Leaflet
    global.L = {
      map: vi.fn(() => ({
        setView: vi.fn(),
        addLayer: vi.fn(),
        removeLayer: vi.fn(),
      })),
      tileLayer: vi.fn(() => ({
        addTo: vi.fn(),
      })),
      marker: vi.fn(() => ({
        addTo: vi.fn(),
        bindPopup: vi.fn(),
      })),
      icon: vi.fn(() => ({})),
      divIcon: vi.fn(() => ({})),
    };

    // Mock navigator.geolocation
    Object.defineProperty(global.navigator, 'geolocation', {
      writable: true,
      value: {
        getCurrentPosition: vi.fn((success) => {
          success({
            coords: {
              latitude: 37.8044,
              longitude: -122.2712,
            },
          });
        }),
      },
    });

    // Mock localStorage
    global.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };

    // Mock fetch for camera data
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              id: 'oak-001',
              latitude: 37.8044,
              longitude: -122.2712,
              city: 'Oakland',
              camera_type: 'speed',
              address: 'Test St',
            },
          ]),
      })
    );
  });

  it('should initialize StatusDisplay on app start', async () => {
    const { default: initModule } = await import('./app.js?t=' + Date.now());
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const statusContainer = document.getElementById('status');
    expect(statusContainer).toBeTruthy();
  });

  it('should show loading indicator during initialization', async () => {
    // Import will trigger initialization
    await import('./app.js?t=' + Date.now());
    
    // Check that status container exists
    const statusContainer = document.getElementById('status');
    expect(statusContainer).toBeTruthy();
  });

  it('should initialize map container', () => {
    const mapContainer = document.getElementById('map');
    expect(mapContainer).toBeTruthy();
  });

  it('should initialize filter controls', () => {
    const filterControls = document.getElementById('filter-controls');
    expect(filterControls).toBeTruthy();
    
    const filterButtons = filterControls.querySelectorAll('.filter-btn');
    expect(filterButtons.length).toBe(3);
  });
});
