import { IMapProvider } from '@/domain/services/IMapProvider';
import { GoogleMapsProvider, GoogleMapsConfig } from './GoogleMapsProvider';
import { AppleMapsProvider, AppleMapsConfig } from './AppleMapsProvider';
import { MapboxProvider, MapboxConfig } from './MapboxProvider';
import { OpenRouteProvider, OpenRouteConfig } from './OpenRouteProvider';

export type MapProviderType = 'google' | 'apple' | 'mapbox' | 'openroute' | 'auto';

export interface MapProviderConfiguration {
  type: MapProviderType;
  google?: GoogleMapsConfig;
  apple?: AppleMapsConfig;
  mapbox?: MapboxConfig;
  openroute?: OpenRouteConfig;
  fallbackProvider?: 'google' | 'apple' | 'mapbox' | 'openroute';
}

export interface MapProviderFeatures {
  staticMaps: boolean;
  geocoding: boolean;
  directions: boolean;
  elevation: boolean;
  realTimeTraffic: boolean;
  offline: boolean;
}

/**
 * Factory class for creating and managing map providers
 * Implements Strategy pattern for different map services
 */
export class MapProviderFactory {
  private static providers: Map<MapProviderType, IMapProvider> = new Map();
  private static activeProvider: IMapProvider | null = null;
  private static configuration: MapProviderConfiguration | null = null;

  /**
   * Initialize map providers with configuration
   */
  static async initialize(config: MapProviderConfiguration): Promise<void> {
    this.configuration = config;

    // Determine which provider to use
    const providerType = this.resolveProviderType(config.type);

    try {
      const provider = await this.createProvider(providerType);
      this.activeProvider = provider;
      this.providers.set(providerType, provider);
    } catch (error) {
      // Try fallback provider if specified
      if (config.fallbackProvider && config.fallbackProvider !== providerType) {
        console.warn(`Primary provider ${providerType} failed, trying fallback: ${config.fallbackProvider}`);
        try {
          const fallbackProvider = await this.createProvider(config.fallbackProvider);
          this.activeProvider = fallbackProvider;
          this.providers.set(config.fallbackProvider, fallbackProvider);
        } catch (fallbackError) {
          throw new Error(`Both primary and fallback providers failed: ${error}, ${fallbackError}`);
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Get the currently active map provider
   */
  static getProvider(): IMapProvider {
    if (!this.activeProvider) {
      throw new Error('Map provider not initialized. Call MapProviderFactory.initialize() first.');
    }
    return this.activeProvider;
  }

  /**
   * Get a specific provider by type
   */
  static async getProviderByType(type: 'google' | 'apple' | 'mapbox' | 'openroute'): Promise<IMapProvider> {
    let provider = this.providers.get(type);

    if (!provider) {
      provider = await this.createProvider(type);
      this.providers.set(type, provider);
    }

    return provider;
  }

  /**
   * Switch to a different provider
   */
  static async switchProvider(type: 'google' | 'apple' | 'mapbox' | 'openroute'): Promise<void> {
    const provider = await this.getProviderByType(type);
    this.activeProvider = provider;
  }

  /**
   * Get available providers and their capabilities
   */
  static getAvailableProviders(): Array<{
    type: MapProviderType;
    name: string;
    capabilities: any;
    isAvailable: boolean;
  }> {
    const providers: Array<{
      type: MapProviderType;
      name: string;
      capabilities: any;
      isAvailable: boolean;
    }> = [];

    // Check Google Maps
    if (this.configuration?.google?.apiKey) {
      const googleProvider = this.providers.get('google') || new GoogleMapsProvider();
      providers.push({
        type: 'google',
        name: googleProvider.name,
        capabilities: googleProvider.capabilities,
        isAvailable: googleProvider.isAvailable()
      });
    }

    // Check Apple Maps
    const appleProvider = this.providers.get('apple') || new AppleMapsProvider();
    providers.push({
      type: 'apple',
      name: appleProvider.name,
      capabilities: appleProvider.capabilities,
      isAvailable: AppleMapsProvider.isApplePlatform()
    });

    return providers;
  }

  /**
   * Get features comparison between providers
   */
  static getProviderFeatures(): Record<string, MapProviderFeatures> {
    return {
      google: {
        staticMaps: true,
        geocoding: true,
        directions: true,
        elevation: false,
        realTimeTraffic: true,
        offline: false
      },
      apple: {
        staticMaps: true, // Limited
        geocoding: true,
        directions: true,
        elevation: false,
        realTimeTraffic: true,
        offline: false
      },
      mapbox: {
        staticMaps: true,
        geocoding: true,
        directions: true,
        elevation: false,
        realTimeTraffic: false,
        offline: true
      },
      openroute: {
        staticMaps: true,
        geocoding: true,
        directions: true,
        elevation: false,
        realTimeTraffic: false,
        offline: false
      }
    };
  }

  /**
   * Get recommended provider based on platform and requirements
   */
  static getRecommendedProvider(requirements?: {
    elevation?: boolean;
    staticMaps?: boolean;
    serverSide?: boolean;
    freeTier?: boolean;
  }): 'google' | 'apple' | 'mapbox' | 'openroute' {
    // Default to OpenRouteService as primary provider
    return 'openroute';
  }

  /**
   * Create a map provider instance
   */
  private static async createProvider(type: 'google' | 'apple' | 'mapbox' | 'openroute'): Promise<IMapProvider> {
    if (!this.configuration) {
      throw new Error('MapProviderFactory not configured');
    }

    switch (type) {
      case 'google':
        if (!this.configuration.google?.apiKey) {
          throw new Error('Google Maps API key not provided');
        }
        const googleProvider = new GoogleMapsProvider();
        await googleProvider.initialize(this.configuration.google);
        return googleProvider;

      case 'apple':
        const appleProvider = new AppleMapsProvider();
        await appleProvider.initialize(this.configuration.apple || {});
        return appleProvider;

      case 'mapbox':
        if (!this.configuration.mapbox?.accessToken) {
          throw new Error('Mapbox access token not provided');
        }
        const mapboxProvider = new MapboxProvider();
        await mapboxProvider.initialize(this.configuration.mapbox);
        return mapboxProvider;

      case 'openroute':
        if (!this.configuration.openroute?.apiKey) {
          throw new Error('OpenRouteService API key not provided');
        }
        const openrouteProvider = new OpenRouteProvider();
        await openrouteProvider.initialize(this.configuration.openroute);
        return openrouteProvider;

      default:
        throw new Error(`Unsupported provider type: ${type}`);
    }
  }

  /**
   * Resolve the actual provider type from configuration
   */
  private static resolveProviderType(type: MapProviderType): 'google' | 'apple' | 'mapbox' | 'openroute' {
    switch (type) {
      case 'google':
        return 'google';
      case 'apple':
        return 'apple';
      case 'mapbox':
        return 'mapbox';
      case 'openroute':
        return 'openroute';
      case 'auto':
        return this.getRecommendedProvider();
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }

  /**
   * Dispose of all providers and clean up resources
   */
  static dispose(): void {
    this.providers.forEach(provider => provider.dispose());
    this.providers.clear();
    this.activeProvider = null;
    this.configuration = null;
  }

  /**
   * Test provider connectivity and functionality
   */
  static async testProvider(type: 'google' | 'apple' | 'mapbox' | 'openroute'): Promise<{
    isAvailable: boolean;
    features: string[];
    errors: string[];
  }> {
    const errors: string[] = [];
    const features: string[] = [];

    try {
      const provider = await this.getProviderByType(type);

      if (provider.isAvailable()) {
        features.push('Basic functionality');

        // Test geocoding
        if (provider.capabilities.supportsGeocoding) {
          try {
            await provider.geocode('New York');
            features.push('Geocoding');
          } catch (error) {
            errors.push(`Geocoding failed: ${error}`);
          }
        }

        // Test reverse geocoding
        if (provider.capabilities.supportsReverseGeocoding) {
          try {
            await provider.reverseGeocode(40.7128, -74.0060);
            features.push('Reverse geocoding');
          } catch (error) {
            errors.push(`Reverse geocoding failed: ${error}`);
          }
        }

        // Test directions
        if (provider.capabilities.supportsDirections) {
          try {
            await provider.getDirections({
              origin: { latitude: 40.7128, longitude: -74.0060 },
              destination: { latitude: 40.7589, longitude: -73.9851 }
            });
            features.push('Directions');
          } catch (error) {
            errors.push(`Directions failed: ${error}`);
          }
        }

        return {
          isAvailable: true,
          features,
          errors
        };
      } else {
        return {
          isAvailable: false,
          features: [],
          errors: ['Provider not available']
        };
      }
    } catch (error) {
      return {
        isAvailable: false,
        features: [],
        errors: [`Provider initialization failed: ${error}`]
      };
    }
  }
}