export interface WiFiEmits {
  (e: 'dismiss'): void;
  (e: 'connect', data: { ssid: string; password: string }): void;
}