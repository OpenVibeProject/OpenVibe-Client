import { WiFiCredentialsRequest } from "./WiFiCredentialsRequest";

export interface WiFiEmits {
  (e: 'dismiss'): void;
  (e: 'connect', data: WiFiCredentialsRequest): void;
}