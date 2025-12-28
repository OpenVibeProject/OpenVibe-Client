// Connection constants
export const WEBSOCKET_PORT = 6969;
export const WEBSOCKET_CONNECTION_TIMEOUT = 10000; // 10 seconds
export const STATUS_REQUEST_INTERVAL = 30000; // 30 seconds

// BLE reconnection constants
export const BLE_MAX_RECONNECT_ATTEMPTS = 5;
export const BLE_MAX_RECONNECT_DELAY = 30000; // 30 seconds

export const TARGET_DEVICE_NAME_PREFIX = 'OpenVibe';

// Default server
export const DEFAULT_SERVER = {
  name: 'OpenVibe',
  url: 'ws://openvibe-server.duckdns.org:6969'
};
