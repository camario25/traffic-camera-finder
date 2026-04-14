import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import CameraService from './CameraService.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('CameraService', () => {
  let service;
  
  beforeEach(() => {
    service = new CameraService();
    // Clear localStorage before each test
    localStorage.clear();
    // Reset fetch mock
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('isCacheFresh()', () => {
    it('should return false when no timestamp exists', () => {
      expect(service.isCacheFresh()).toBe(false);
    });

    it('should return true when cache is 0 days old', () => {
      const now = Date.now();
      localStorage.setItem('cameraDataTimestamp', now.toString());
      expect(service.isCacheFresh()).toBe(true);
    });

    it('should return true when cache is 6.9 days old', () => {
      const sixPointNineDaysAgo = Date.now() - (6.9 * 24 * 60 * 60 * 1000);
      localStorage.setItem('cameraDataTimestamp', sixPointNineDaysAgo.toString());
      expect(service.isCacheFresh()).toBe(true);
    });

    it('should return false when cache is exactly 7 days old', () => {
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      localStorage.setItem('cameraDataTimestamp', sevenDaysAgo.toString());
      expect(service.isCacheFresh()).toBe(false);
    });

    it('should return false when cache is 30 days old', () => {
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      localStorage.setItem('cameraDataTimestamp', thirtyDaysAgo.toString());
      expect(service.isCacheFresh()).toBe(false);
    });

    it('should return false when localStorage is unavailable', () => {
      // Mock localStorage.getItem to throw an error
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = vi.fn(() => {
        throw new Error('localStorage unavailable');
      });

      expect(service.isCacheFresh()).toBe(false);

      // Restore original method
      localStorage.getItem = originalGetItem;
    });
  });

  describe('getCachedCameras()', () => {
    it('should return null when no cached data exists', () => {
      expect(service.getCachedCameras()).toBe(null);
    });

    it('should return parsed camera array when valid data exists', () => {
      const cameras = [
        { id: 'oak-001', lat: 37.8044, lng: -122.2712, city: 'Oakland', type: 'Speed Camera' },
        { id: 'sf-001', lat: 37.7749, lng: -122.4194, city: 'San Francisco', type: 'Red Light Camera' }
      ];
      localStorage.setItem('cameraData', JSON.stringify(cameras));

      const result = service.getCachedCameras();
      expect(result).toEqual(cameras);
    });

    it('should return null when JSON parsing fails', () => {
      localStorage.setItem('cameraData', 'invalid json {{{');
      expect(service.getCachedCameras()).toBe(null);
    });

    it('should return null when localStorage is unavailable', () => {
      // Mock localStorage.getItem to throw an error
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = vi.fn(() => {
        throw new Error('localStorage unavailable');
      });

      expect(service.getCachedCameras()).toBe(null);

      // Restore original method
      localStorage.getItem = originalGetItem;
    });
  });

  describe('setCachedCameras()', () => {
    it('should store camera data and timestamp in localStorage', () => {
      const cameras = [
        { id: 'oak-001', lat: 37.8044, lng: -122.2712, city: 'Oakland', type: 'Speed Camera' }
      ];

      service.setCachedCameras(cameras);

      const storedData = localStorage.getItem('cameraData');
      const storedTimestamp = localStorage.getItem('cameraDataTimestamp');

      expect(storedData).toBe(JSON.stringify(cameras));
      expect(storedTimestamp).toBeTruthy();
      expect(parseInt(storedTimestamp, 10)).toBeCloseTo(Date.now(), -2); // Within ~100ms
    });

    it('should handle localStorage quota exceeded error gracefully', () => {
      const cameras = [
        { id: 'oak-001', lat: 37.8044, lng: -122.2712, city: 'Oakland', type: 'Speed Camera' }
      ];

      // Mock localStorage.setItem to throw QuotaExceededError
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });

      // Should not throw - should handle gracefully
      expect(() => service.setCachedCameras(cameras)).not.toThrow();

      // Restore original method
      localStorage.setItem = originalSetItem;
    });

    it('should handle localStorage unavailable error gracefully', () => {
      const cameras = [
        { id: 'oak-001', lat: 37.8044, lng: -122.2712, city: 'Oakland', type: 'Speed Camera' }
      ];

      // Mock localStorage.setItem to throw generic error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error('localStorage unavailable');
      });

      // Should not throw - should handle gracefully
      expect(() => service.setCachedCameras(cameras)).not.toThrow();

      // Restore original method
      localStorage.setItem = originalSetItem;
    });

    it('should store empty array correctly', () => {
      const cameras = [];
      service.setCachedCameras(cameras);

      const storedData = localStorage.getItem('cameraData');
      expect(storedData).toBe('[]');
    });
  });

  describe('_parseAPIResponse()', () => {
    it('should parse API format to Camera model format', () => {
      const apiData = [
        {
          id: 'oak-001',
          latitude: 37.8044,
          longitude: -122.2712,
          city: 'Oakland',
          camera_type: 'speed',
          address: 'International Blvd & 23rd Ave'
        },
        {
          id: 'sf-001',
          latitude: 37.7749,
          longitude: -122.4194,
          city: 'San Francisco',
          camera_type: 'red_light',
          address: 'Market St & 5th St'
        }
      ];

      const result = service._parseAPIResponse(apiData);

      expect(result).toEqual([
        {
          id: 'oak-001',
          lat: 37.8044,
          lng: -122.2712,
          city: 'Oakland',
          type: 'Speed Camera',
          location: 'International Blvd & 23rd Ave'
        },
        {
          id: 'sf-001',
          lat: 37.7749,
          lng: -122.4194,
          city: 'San Francisco',
          type: 'Red Light Camera',
          location: 'Market St & 5th St'
        }
      ]);
    });

    it('should handle camera_type values that are not speed or red_light', () => {
      const apiData = [
        {
          id: 'oak-002',
          latitude: 37.8044,
          longitude: -122.2712,
          city: 'Oakland',
          camera_type: 'traffic_monitoring',
          address: 'Broadway & 12th St'
        }
      ];

      const result = service._parseAPIResponse(apiData);

      expect(result[0].type).toBe('traffic_monitoring');
    });

    it('should throw error when API data is not an array', () => {
      expect(() => service._parseAPIResponse({})).toThrow('API response must be an array');
      expect(() => service._parseAPIResponse(null)).toThrow('API response must be an array');
      expect(() => service._parseAPIResponse('string')).toThrow('API response must be an array');
    });

    it('should handle empty array', () => {
      const result = service._parseAPIResponse([]);
      expect(result).toEqual([]);
    });
  });

  describe('getCameras()', () => {
    it('should load from cache when cache is fresh', async () => {
      const cachedCameras = [
        { id: 'oak-001', lat: 37.8044, lng: -122.2712, city: 'Oakland', type: 'Speed Camera' }
      ];

      // Set up fresh cache (less than 7 days old)
      localStorage.setItem('cameraData', JSON.stringify(cachedCameras));
      localStorage.setItem('cameraDataTimestamp', Date.now().toString());

      const result = await service.getCameras();

      expect(result).toEqual(cachedCameras);
      // Verify fetch was NOT called
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should fetch from API when cache is stale', async () => {
      const cachedCameras = [
        { id: 'oak-001', lat: 37.8044, lng: -122.2712, city: 'Oakland', type: 'Speed Camera' }
      ];
      const freshCameras = [
        { id: 'oak-002', lat: 37.8050, lng: -122.2720, city: 'Oakland', type: 'Red Light Camera', location: 'Broadway & 14th St' }
      ];

      // Set up stale cache (8 days old)
      const eightDaysAgo = Date.now() - (8 * 24 * 60 * 60 * 1000);
      localStorage.setItem('cameraData', JSON.stringify(cachedCameras));
      localStorage.setItem('cameraDataTimestamp', eightDaysAgo.toString());

      // Mock API response
      const mockApiData = [
        {
          id: 'oak-002',
          latitude: 37.8050,
          longitude: -122.2720,
          city: 'Oakland',
          camera_type: 'red_light',
          address: 'Broadway & 14th St'
        }
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockApiData
      });

      const result = await service.getCameras();

      expect(result).toEqual(freshCameras);
      expect(global.fetch).toHaveBeenCalled();
      
      // Verify new data was cached
      const newCachedData = localStorage.getItem('cameraData');
      expect(JSON.parse(newCachedData)).toEqual(freshCameras);
    });

    it('should fetch from API when no cache exists', async () => {
      const freshCameras = [
        { id: 'sf-001', lat: 37.7749, lng: -122.4194, city: 'San Francisco', type: 'Speed Camera', location: 'Market St & 5th St' }
      ];

      // Mock API response
      const mockApiData = [
        {
          id: 'sf-001',
          latitude: 37.7749,
          longitude: -122.4194,
          city: 'San Francisco',
          camera_type: 'speed',
          address: 'Market St & 5th St'
        }
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockApiData
      });

      const result = await service.getCameras();

      expect(result).toEqual(freshCameras);
      expect(global.fetch).toHaveBeenCalled();
      
      // Verify data was cached
      const cachedData = localStorage.getItem('cameraData');
      expect(JSON.parse(cachedData)).toEqual(freshCameras);
    });

    it('should fall back to stale cache if API fetch fails', async () => {
      const staleCameras = [
        { id: 'oak-001', lat: 37.8044, lng: -122.2712, city: 'Oakland', type: 'Speed Camera' }
      ];

      // Set up stale cache (10 days old)
      const tenDaysAgo = Date.now() - (10 * 24 * 60 * 60 * 1000);
      localStorage.setItem('cameraData', JSON.stringify(staleCameras));
      localStorage.setItem('cameraDataTimestamp', tenDaysAgo.toString());

      // Mock API failure
      global.fetch.mockRejectedValueOnce(new Error('Failed to fetch'));

      const result = await service.getCameras();

      expect(result).toEqual(staleCameras);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should throw error if API fetch fails and no cache exists', async () => {
      // No cache set up

      // Mock API failure
      global.fetch.mockRejectedValueOnce(new Error('Failed to fetch'));

      await expect(service.getCameras()).rejects.toThrow('Unable to load camera data');
    });

    it('should store fetched data in cache with timestamp', async () => {
      const freshCameras = [
        { id: 'oak-001', lat: 37.8044, lng: -122.2712, city: 'Oakland', type: 'Speed Camera', location: 'International Blvd & 23rd Ave' }
      ];

      // Mock API response
      const mockApiData = [
        {
          id: 'oak-001',
          latitude: 37.8044,
          longitude: -122.2712,
          city: 'Oakland',
          camera_type: 'speed',
          address: 'International Blvd & 23rd Ave'
        }
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockApiData
      });

      await service.getCameras();

      // Verify data and timestamp were stored
      const cachedData = localStorage.getItem('cameraData');
      const cachedTimestamp = localStorage.getItem('cameraDataTimestamp');

      expect(JSON.parse(cachedData)).toEqual(freshCameras);
      expect(cachedTimestamp).toBeTruthy();
      expect(parseInt(cachedTimestamp, 10)).toBeCloseTo(Date.now(), -2);
    });
  });

  describe('fetchCamerasFromAPI()', () => {
    it('should successfully fetch and parse camera data', async () => {
      const mockApiData = [
        {
          id: 'oak-001',
          latitude: 37.8044,
          longitude: -122.2712,
          city: 'Oakland',
          camera_type: 'speed',
          address: 'International Blvd & 23rd Ave'
        }
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockApiData
      });

      const result = await service.fetchCamerasFromAPI();

      expect(result).toEqual([
        {
          id: 'oak-001',
          lat: 37.8044,
          lng: -122.2712,
          city: 'Oakland',
          type: 'Speed Camera',
          location: 'International Blvd & 23rd Ave'
        }
      ]);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/cameras.json',
        expect.objectContaining({
          headers: { 'Accept': 'application/json' }
        })
      );
    });

    it('should throw error when API returns non-OK status', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      await expect(service.fetchCamerasFromAPI()).rejects.toThrow('API request failed with status 404');
    });

    it('should throw error when API returns invalid JSON', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('Unexpected token');
        }
      });

      await expect(service.fetchCamerasFromAPI()).rejects.toThrow('API returned invalid JSON');
    });

    it('should throw error when network request fails', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Failed to fetch'));

      await expect(service.fetchCamerasFromAPI()).rejects.toThrow('Network error: Unable to reach camera data API');
    });

    it('should throw error when request times out', async () => {
      // Create a real AbortController to simulate the timeout behavior
      let capturedSignal;
      
      global.fetch.mockImplementationOnce((url, options) => {
        capturedSignal = options.signal;
        return new Promise((resolve, reject) => {
          // Listen for abort signal
          options.signal.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        });
      });

      await expect(service.fetchCamerasFromAPI()).rejects.toThrow('API request timed out after 10 seconds');
    }, 15000); // Increase test timeout to 15 seconds to allow for the 10 second API timeout

    it('should handle abort controller correctly', async () => {
      const mockApiData = [
        {
          id: 'oak-001',
          latitude: 37.8044,
          longitude: -122.2712,
          city: 'Oakland',
          camera_type: 'speed',
          address: 'International Blvd & 23rd Ave'
        }
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockApiData
      });

      await service.fetchCamerasFromAPI();

      // Verify fetch was called with abort signal
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/cameras.json',
        expect.objectContaining({
          signal: expect.any(AbortSignal)
        })
      );
    });

    it('should throw error when API response is not an array', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ error: 'Invalid format' })
      });

      await expect(service.fetchCamerasFromAPI()).rejects.toThrow('API response must be an array');
    });
  });
});
