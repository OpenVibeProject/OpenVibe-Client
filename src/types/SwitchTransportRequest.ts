import { BaseRequest } from "./BaseRequest";
import { TransportType } from "./TransportEnum"

export interface SwitchTransportRequest extends BaseRequest {
    transport: TransportType
    serverAddress?: string
}