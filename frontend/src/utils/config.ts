// Configuration utility for frontend
// Supports backend-injected config for custom base URL

/**
 * Get the base URL for API and sharing
 * Priority:
 * 1. Backend-injected config (window.__GOHTTPSERVER_CONFIG__.baseURL) - from --base-url parameter
 * 2. window.location.origin (current page origin) - fallback
 */
export function getBaseUrl(): string {
  // Check if backend injected config is available (from --base-url parameter)
  const backendConfig = (window as any).__GOHTTPSERVER_CONFIG__;
  if (backendConfig && backendConfig.baseURL && typeof backendConfig.baseURL === 'string') {
    const baseURL = backendConfig.baseURL.trim();
    if (baseURL !== '') {
      // Remove trailing slash if present
      return baseURL.replace(/\/$/, '');
    }
  }
  
  // Fallback to current origin
  return window.location.origin;
}
