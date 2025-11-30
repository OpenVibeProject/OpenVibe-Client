import { BaseRequest } from "./BaseRequest";

export interface TransportConfigRequest extends BaseRequest {
    bluetoothEnabled: boolean;
    wifiEnabled: boolean;
    remoteEnabled: boolean;
}