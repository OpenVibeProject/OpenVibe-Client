import { WiFiNetwork } from "./WiFiNetwork";

export interface WiFiProps {
  isOpen: boolean;
  network: WiFiNetwork | null;
  error?: string;
  isCustom?: boolean;
}