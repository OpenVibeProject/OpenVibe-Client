import { defineStore } from 'pinia';
import { ref } from 'vue';
import { StatusResponse } from '@/types/StatusResponse';
import { useBleStore } from '@/stores/ble';
import { useWebSocketStore } from '@/stores/websocket';
import { useDebugStore } from '@/stores/debug';
import { RequestEnum } from '@/types/RequestEnum';
import { TransportType } from '@/types/TransportEnum';
import { LogLevel } from '@/types/LogLevel';
import { STATUS_REQUEST_INTERVAL } from '@/constants';

export const useVibratorStore = defineStore('vibrator', () => {
  const status = ref<StatusResponse | null>(null);
  const isConnected = ref(false);
  const connectionType = ref<TransportType | null>(null);
  const wsConnectionAttempted = ref(false);
  const pendingTransport = ref<TransportType | null>(null);
  const pendingServerAddress = ref<string | null>(null);
  const pendingDeviceId = ref<string | null>(null);
  let transportSwitchResolve: ((status: StatusResponse) => void) | null = null;

  const bleStore = useBleStore();
  const wsStore = useWebSocketStore();
  const debugStore = useDebugStore();

  let bleConnectedUnsub: (() => void) | null = null;
  let bleNotificationUnsub: (() => void) | null = null;
  let bleDisconnectedUnsub: (() => void) | null = null;
  let wsConnectedUnsub: (() => void) | null = null;
  let wsMessageUnsub: (() => void) | null = null;
  let wsDisconnectedUnsub: (() => void) | null = null;
  const localRemoteConnect = ref(false);
  let remoteConnectResolve: ((status: StatusResponse) => void) | null = null;
  let remoteConnectTimeout: number | null = null;

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
        // Some notifications may be partial (e.g. only intensity). If so,
        // merge into the existing status to keep UI state consistent.
        if (payload.parsed.requestType === RequestEnum.INTENSITY) {
          status.value = {
            ...(status.value || {}),
            intensity: payload.parsed.intensity
          } as StatusResponse;
        } else {
          updateStatus(payload.parsed);
        }
      }
    });
    
    bleDisconnectedUnsub = bleStore.on('disconnected', () => {
      if (connectionType.value === TransportType.BLE) {
        clearConnection();
      }
    });
    
    wsConnectedUnsub = wsStore.on('connected', () => {
      if (localRemoteConnect.value) {
        // manual remote connect (user-entered device id) should be treated
        // as talking to a remote device over the socket server, not as
        // switching this device's transport.
        setConnection(TransportType.REMOTE);
        localRemoteConnect.value = false;
      } else {
        setConnection(TransportType.WIFI);
      }
      requestStatus();
    });
    
    wsMessageUnsub = wsStore.on('message', (payload: any) => {
      if (payload.parsed && (connectionType.value === TransportType.WIFI || connectionType.value === TransportType.REMOTE)) {
        // Handle partial messages (e.g. INTENSITY) by merging into existing status
        if (payload.parsed.requestType === RequestEnum.INTENSITY) {
          status.value = {
            ...(status.value || {}),
            intensity: payload.parsed.intensity
          } as StatusResponse;
        } else {
          updateStatus(payload.parsed);
        }

        // If we initiated a manual remote connect, resolve the promise
        // when we get the first STATUS response for that remote device.
        if (remoteConnectResolve && connectionType.value === TransportType.REMOTE && status.value) {
          if (remoteConnectTimeout) {
            clearTimeout(remoteConnectTimeout);
            remoteConnectTimeout = null;
          }
          remoteConnectResolve(status.value);
          remoteConnectResolve = null;
        }
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
    
    if (pendingTransport.value) {
      debugStore.addLog(LogLevel.INFO, `Switching transport: ${connectionType.value} -> ${pendingTransport.value}`);
      const targetTransport = pendingTransport.value;
      connectionType.value = targetTransport;
      pendingTransport.value = null;
      
      // Connect to WebSocket if switching to WIFI or REMOTE
      if ((targetTransport === TransportType.WIFI || targetTransport === TransportType.REMOTE)) {
        let connectAddress: string;
        if (targetTransport === TransportType.REMOTE && (newStatus as any).serverAddress && newStatus.deviceId) {
          connectAddress = `${(newStatus as any).serverAddress}/pair?id=${newStatus.deviceId}`;
        } else {
          connectAddress = newStatus.ipAddress!;
        }
        debugStore.addLog(LogLevel.INFO, `Connecting to WebSocket at ${connectAddress}`);
        wsStore.connect(connectAddress);
        pendingServerAddress.value = null;
        pendingDeviceId.value = null;
      }
      
      if (transportSwitchResolve) {
        debugStore.addLog(LogLevel.INFO, 'Resolving transport switch promise');
        transportSwitchResolve(newStatus);
        transportSwitchResolve = null;
      }
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

  const switchTransport = async (newTransport: TransportType, serverAddress?: string, deviceId?: string): Promise<StatusResponse> => {
    debugStore.addLog(LogLevel.INFO, `switchTransport: ${connectionType.value} -> ${newTransport}, connected=${isConnected.value}`);
    if (!isConnected.value) {
      // If user requested a remote transport but we are not currently
      // connected to a device, allow a direct remote connect instead of
      // failing with "Not connected". This covers UI flows that attempt
      // to switch to a remote server by providing an address/device id.
      if (newTransport === TransportType.REMOTE && serverAddress) {
        debugStore.addLog(LogLevel.INFO, 'Not connected locally — performing direct remote connect');

        return new Promise((resolve, reject) => {
          const base = serverAddress.replace(/\/$/, '');
          const connectAddress = `${base}/pair?id=${encodeURIComponent(deviceId || '')}`;

          localRemoteConnect.value = true;
          remoteConnectResolve = resolve;

          // safety timeout
          remoteConnectTimeout = window.setTimeout(() => {
            remoteConnectTimeout = null;
            localRemoteConnect.value = false;
            if (remoteConnectResolve) {
              remoteConnectResolve = null;
            }
            reject(new Error('Remote connect timed out'));
          }, 8000);

          try {
            wsStore.connect(connectAddress);
          } catch (error) {
            if (remoteConnectTimeout) {
              clearTimeout(remoteConnectTimeout);
              remoteConnectTimeout = null;
            }
            remoteConnectResolve = null;
            localRemoteConnect.value = false;
            debugStore.addLog(LogLevel.ERROR, `Failed to connect to remote websocket: ${error}`);
            reject(error);
          }
        });
      }

      throw new Error('Not connected');
    }

    return new Promise((resolve, reject) => {
      const switchRequest = { 
        requestType: RequestEnum.SWITCH_TRANSPORT, 
        transport: newTransport,
        ...(serverAddress && { serverAddress })
      };
      const payload = JSON.stringify(switchRequest);
      pendingTransport.value = newTransport;
      if (serverAddress) pendingServerAddress.value = serverAddress;
      if (deviceId) pendingDeviceId.value = deviceId;
      transportSwitchResolve = resolve;
      debugStore.addLog(LogLevel.DEBUG, `Sending on ${connectionType.value}: ${payload}`);

      try {
        if (connectionType.value === TransportType.BLE) {
          bleStore.writeCharacteristic(payload);
        } else if (connectionType.value === TransportType.WIFI || connectionType.value === TransportType.REMOTE) {
          wsStore.send(switchRequest);
        }
        debugStore.addLog(LogLevel.DEBUG, 'Switch request sent, waiting for STATUS response');
      } catch (error) {
        debugStore.addLog(LogLevel.ERROR, `Failed to switch transport: ${error}`);
        pendingTransport.value = null;
        transportSwitchResolve = null;
        reject(error);
      }
    });
  };

  const connectRemote = async (serverUrl: string, deviceId: string): Promise<StatusResponse> => {
    debugStore.addLog(LogLevel.INFO, `Connecting to remote server: ${serverUrl} with device ID: ${deviceId}`);

    return new Promise((resolve, reject) => {
      const base = serverUrl.replace(/\/$/, '');
      const connectAddress = `${base}/pair?id=${encodeURIComponent(deviceId)}`;

      localRemoteConnect.value = true;
      remoteConnectResolve = resolve;

      // safety timeout
      remoteConnectTimeout = window.setTimeout(() => {
        remoteConnectTimeout = null;
        localRemoteConnect.value = false;
        if (remoteConnectResolve) {
          remoteConnectResolve = null;
        }
        reject(new Error('Remote connect timed out'));
      }, 8000);

      try {
        wsStore.connect(connectAddress);
      } catch (error) {
        if (remoteConnectTimeout) {
          clearTimeout(remoteConnectTimeout);
          remoteConnectTimeout = null;
        }
        remoteConnectResolve = null;
        localRemoteConnect.value = false;
        debugStore.addLog(LogLevel.ERROR, `Failed to connect to remote websocket: ${error}`);
        reject(error);
      }
    });
  };

  initListeners();

  const setCurrentTransport = (transport: TransportType) => {
    connectionType.value = transport;
  };

  return {
    status,
    isConnected,
    connectionType,
    updateStatus,
    setConnection,
    clearConnection,
    requestStatus,
    setIntensity,
    switchTransport,
    connectRemote,
    setCurrentTransport,
    cleanupListeners
  };
});