import { defineStore } from 'pinia';
import { ref } from 'vue';
import { TransportType } from '@/types/TransportEnum';
import { useBleStore } from '@/stores/ble';
import { useWebSocketStore } from '@/stores/websocket';
import { useDebugStore } from '@/stores/debug';
import { LogLevel } from '@/types/LogLevel';
import { SwitchTransportRequest } from '@/types/SwitchTransportRequest';
import { RequestEnum } from '@/types/RequestEnum';

export const useTransportStore = defineStore('transport', () => {
  const currentTransport = ref<TransportType | null>(null);
  const debugStore = useDebugStore();

  async function switchTransport(newTransport: TransportType, target?: string) {
    const bleStore = useBleStore();
    const wsStore = useWebSocketStore();

    if (currentTransport.value) {
      const switchTransportRequest: SwitchTransportRequest = { 
        requestType: RequestEnum.SWITCH_TRANSPORT,
        transport: newTransport,
        serverAddress: target
      };
      
      try {
        if (currentTransport.value === TransportType.BLE && bleStore.isConnected) {
          await bleStore.writeCharacteristic(JSON.stringify(switchTransportRequest));
          debugStore.addLog(LogLevel.INFO, `Sent SWITCH_TRANSPORT via BLE: ${newTransport}`);
        } else if ((currentTransport.value === TransportType.WIFI || currentTransport.value === TransportType.REMOTE) && wsStore.isConnected) {
          wsStore.send(switchTransportRequest);
          debugStore.addLog(LogLevel.INFO, `Sent SWITCH_TRANSPORT via WebSocket: ${newTransport}`);
        }
      } catch (error) {
        debugStore.addLog(LogLevel.ERROR, `Failed to send SWITCH_TRANSPORT: ${error}`);
      }
    }

    // Disconnect current transport
    if (currentTransport.value === TransportType.BLE && bleStore.isConnected) {
      await bleStore.disconnect();
    } else if ((currentTransport.value === TransportType.WIFI || currentTransport.value === TransportType.REMOTE) && wsStore.isConnected) {
      wsStore.disconnect();
    }

    // Connect to new transport
    currentTransport.value = newTransport;
    
    if (newTransport === TransportType.BLE) {
      // BLE connection handled separately
      debugStore.addLog(LogLevel.INFO, `Switched to BLE transport`);
    } else if (newTransport === TransportType.WIFI || newTransport === TransportType.REMOTE) {
      if (target) {
        wsStore.connect(target);
        debugStore.addLog(LogLevel.INFO, `Switched to ${newTransport} transport: ${target}`);
      }
    }
  }

  function setCurrentTransport(transport: TransportType) {
    currentTransport.value = transport;
  }

  return {
    currentTransport,
    switchTransport,
    setCurrentTransport
  };
});