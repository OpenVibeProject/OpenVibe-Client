import { defineStore } from 'pinia';
import { ref } from 'vue';
import { StatusResponse } from '@/types/StatusResponse';
import { useBleStore } from '@/stores/ble';
import { useWebSocketStore } from '@/stores/websocket';
import { RequestEnum } from '@/types/RequestEnum';
import { TransportType } from '@/types/TransportEnum';
import { STATUS_REQUEST_INTERVAL } from '@/constants';

export const useVibratorStore = defineStore('vibrator', () => {
  const status = ref<StatusResponse | null>(null);
  const isConnected = ref(false);
  const connectionType = ref<TransportType | null>(null);
  const wsConnectionAttempted = ref(false);

  const bleStore = useBleStore();
  const wsStore = useWebSocketStore();

  let bleConnectedUnsub: (() => void) | null = null;
  let bleNotificationUnsub: (() => void) | null = null;
  let bleDisconnectedUnsub: (() => void) | null = null;
  let wsConnectedUnsub: (() => void) | null = null;
  let wsMessageUnsub: (() => void) | null = null;
  let wsDisconnectedUnsub: (() => void) | null = null;

  const initListeners = () => {
    bleConnectedUnsub = bleStore.on('notifying', () => {
      setConnection(TransportType.BLE);
      setInterval(() => {
        requestStatus();
      }, STATUS_REQUEST_INTERVAL)
      requestStatus();
    });
    
    bleNotificationUnsub = bleStore.on('notification', (payload: any) => {
      if (payload.parsed && connectionType.value === TransportType.BLE) {
        updateStatus(payload.parsed);
      }
    });
    
    bleDisconnectedUnsub = bleStore.on('disconnected', () => {
      if (connectionType.value === TransportType.BLE) {
        clearConnection();
      }
    });
    
    wsConnectedUnsub = wsStore.on('connected', () => {
      setConnection(TransportType.WIFI);
      requestStatus();
    });
    
    wsMessageUnsub = wsStore.on('message', (payload: any) => {
      if (payload.parsed && (connectionType.value === TransportType.WIFI || connectionType.value === TransportType.REMOTE)) {
        updateStatus(payload.parsed);
      }
    });
    
    wsDisconnectedUnsub = wsStore.on('disconnected', () => {
      if (connectionType.value === TransportType.WIFI || connectionType.value === TransportType.REMOTE) {
        clearConnection();
      }
    });
  };

  const cleanupListeners = () => {
    if (bleConnectedUnsub) bleConnectedUnsub();
    if (bleNotificationUnsub) bleNotificationUnsub();
    if (bleDisconnectedUnsub) bleDisconnectedUnsub();
    if (wsConnectedUnsub) wsConnectedUnsub();
    if (wsMessageUnsub) wsMessageUnsub();
    if (wsDisconnectedUnsub) wsDisconnectedUnsub();
  };

  const updateStatus = (newStatus: StatusResponse) => {
    status.value = newStatus;
    
    if (newStatus.isWifiConnected && newStatus.ipAddress && 
        connectionType.value !== TransportType.WIFI && !wsStore.isConnected && !wsConnectionAttempted.value) {
      wsConnectionAttempted.value = true;
      wsStore.connect(newStatus.ipAddress);
    }
  };

  const setConnection = (type: TransportType) => {
    connectionType.value = type;
    isConnected.value = true;
  };

  const clearConnection = () => {
    connectionType.value = null;
    isConnected.value = false;
    status.value = null;
    wsConnectionAttempted.value = false;
  };

  const requestStatus = async () => {
    if (!isConnected.value) return;

    const statusRequest = { requestType: RequestEnum.STATUS };

    try {
      if (connectionType.value === TransportType.BLE) {
        await bleStore.writeCharacteristic(JSON.stringify(statusRequest));
      } else if (connectionType.value === TransportType.WIFI || connectionType.value === TransportType.REMOTE) {
        wsStore.send(statusRequest);
      }
    } catch (error) {
      console.error('Failed to request status:', error);
    }
  };

  const setIntensity = async (intensity: number) => {
    if (!isConnected.value) return;

    const intensityRequest = { requestType: RequestEnum.INTENSITY, intensity };

    try {
      if (connectionType.value === TransportType.BLE) {
        await bleStore.writeCharacteristic(JSON.stringify(intensityRequest));
      } else if (connectionType.value === TransportType.WIFI || connectionType.value === TransportType.REMOTE) {
        wsStore.send(intensityRequest);
      }
      
      // Request status to update UI with new intensity
      await requestStatus();
    } catch (error) {
      console.error('Failed to set intensity:', error);
    }
  };

  initListeners();

  return {
    status,
    isConnected,
    connectionType,
    updateStatus,
    setConnection,
    clearConnection,
    requestStatus,
    setIntensity,
    cleanupListeners
  };
});