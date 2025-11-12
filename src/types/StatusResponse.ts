import { TransportType } from "./TransportEnum";

export type StatusResponse = {
    intensity: number;
    battery: number;
    isCharging: boolean;
    isBluetoothConnected: boolean;
    isWifiConnected: boolean;
    ipAddress: string | null;
    macAddress: string;
    version: string;
    deviceId: string;
    serverAddress: string | null;
    transport: TransportType;
}