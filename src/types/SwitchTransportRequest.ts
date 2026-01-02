import { BaseRequest } from "./BaseRequest";
import { TransportTypeEnum } from "./TransportTypeEnum"

export interface SwitchTransportRequest extends BaseRequest {
    transport: TransportTypeEnum
    serverAddress?: string
}