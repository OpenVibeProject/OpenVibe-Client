import { BaseRequest } from "./BaseRequest";

export interface WiFiCredentialsRequest extends BaseRequest {
    ssid: string;
    password: string;
}