import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import GeolocationService from './GeolocationService.js';

describe('GeolocationService', () => {
  let service;
  let originalGeolocation;

  beforeEach(() => {
    service = new GeolocationService();
    
    // Save original geolocation
    originalGeolocation = global.navigator.geolocation;
  });

  afterEach(() => {
    // Restore original geolocation
    if (originalGeolocation) {
      Object.defineProperty(global.navigator, 'geolocation', {
        value: originalGeolocation,
        writable: true,
        configurable: true
      });
    }
    vi.restoreAllMocks();
  });

  describe('getDefaultCenter', () => {
    it('should return San Francisco center coordinates', () => {
      const center = service.getDefaultCenter();
      
      expect(center).toEqual({
        lat: 37.7749,
        lng: -122.4194
      });
    });

    it('should return a new object each time (not a reference)', () => {
      const center1 = service.getDefaultCenter();
      const center2 = service.getDefaultCenter();
      
      expect(center1).not.toBe(center2);
      expect(center1).toEqual(center2);
    });
  });

  describe('getUserLocation', () => {
    it('should return user coordinates on successful geolocation', async () => {
      const mockPosition = {
        coords: {
          latitude: 37.8044,
          longitude: -122.2712
        }
      };

      const mockGetCurrentPosition = vi.fn((success) => {
        success(mockPosition);
      });

      // Mock navigator.geolocation
      Object.defineProperty(global.navigator, 'geolocation', {
        value: {
          getCurrentPosition: mockGetCurrentPosition
        },
        writable: true,
        configurable: true
      });

      const location = await service.getUserLocation();

      expect(location).toEqual({
        lat: 37.8044,
        lng: -122.2712
      });
      expect(mockGetCurrentPosition).toHaveBeenCalledTimes(1);
    });

    it('should return default center when geolocation API is not available', async () => {
      // Remove geolocation from navigator
      Object.defineProperty(global.navigator, 'geolocation', {
        value: undefined,
        writable: true,
        configurable: true
      });

      const location = await service.getUserLocation();

      expect(location).toEqual({
        lat: 37.7749,
        lng: -122.4194
      });
    });

    it('should return default center on PERMISSION_DENIED error', async () => {
      const mockError = {
        code: 1, // PERMISSION_DENIED
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      };

      const mockGetCurrentPosition = vi.fn((success, error) => {
        error(mockError);
      });

      Object.defineProperty(global.navigator, 'geolocation', {
        value: {
          getCurrentPosition: mockGetCurrentPosition
        },
        writable: true,
        configurable: true
      });

      const location = await service.getUserLocation();

      expect(location).toEqual({
        lat: 37.7749,
        lng: -122.4194
      });
    });

    it('should return default center on POSITION_UNAVAILABLE error', async () => {
      const mockError = {
        code: 2, // POSITION_UNAVAILABLE
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      };

      const mockGetCurrentPosition = vi.fn((success, error) => {
        error(mockError);
      });

      Object.defineProperty(global.navigator, 'geolocation', {
        value: {
          getCurrentPosition: mockGetCurrentPosition
        },
        writable: true,
        configurable: true
      });

      const location = await service.getUserLocation();

      expect(location).toEqual({
        lat: 37.7749,
        lng: -122.4194
      });
    });

    it('should return default center on TIMEOUT error', async () => {
      const mockError = {
        code: 3, // TIMEOUT
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      };

      const mockGetCurrentPosition = vi.fn((success, error) => {
        error(mockError);
      });

      Object.defineProperty(global.navigator, 'geolocation', {
        value: {
          getCurrentPosition: mockGetCurrentPosition
        },
        writable: true,
        configurable: true
      });

      const location = await service.getUserLocation();

      expect(location).toEqual({
        lat: 37.7749,
        lng: -122.4194
      });
    });

    it('should pass correct options to getCurrentPosition', async () => {
      const mockGetCurrentPosition = vi.fn((success) => {
        success({
          coords: { latitude: 37.8044, longitude: -122.2712 }
        });
      });

      Object.defineProperty(global.navigator, 'geolocation', {
        value: {
          getCurrentPosition: mockGetCurrentPosition
        },
        writable: true,
        configurable: true
      });

      await service.getUserLocation();

      expect(mockGetCurrentPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    });
  });
});
