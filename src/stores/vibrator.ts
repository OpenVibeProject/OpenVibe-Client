import { defineStore } from 'pinia';
import { ref } from 'vue';
import { StatusResponse } from '@/types/StatusResponse';
import { useBleStore } from '@/stores/ble';
import { useWebSocketStore } from '@/stores/websocket';
import { useDebugStore } from '@/stores/debug';
import { RequestEnum } from '@/types/RequestEnum';
import { TransportTypeEnum } from '@/types/TransportTypeEnum';
import { LogLevel } from '@/types/LogLevel';
import { STATUS_REQUEST_INTERVAL, WEBSOCKET_PORT } from '@/constants';
import { BLEEmitterEnum } from '@/types/BLEEmitterEnum';
import { WiFiEmitterEnum } from '@/types/WiFiEmitterEnum';
import { Emitter } from '@/utils/Emitter';
import { GlobalEmitterEnum } from '@/types/GlobalEmitterEnum';

export const useVibratorStore = defineStore('vibrator', {
  state: () => ({
    status: ref<StatusResponse | null>(null),
    transport: ref<TransportTypeEnum | null>(TransportTypeEnum.BLE),
    emitter: ref<Emitter>(new Emitter()),
    listener: ref<any>(null),
    pollingInterval: ref<number | null>(null)
  }),
  getters: {
    isConnected() {
      const bleStore = useBleStore();
      const wsStore = useWebSocketStore();

      return bleStore.device !== null || wsStore.isConnected;
    }
  },
  actions: {
    switchTransport(newTransport: TransportTypeEnum, serverAddress?: string, deviceId?: string)
    {
      const debugStore = useDebugStore();
      const wsStore = useWebSocketStore();

      debugStore.addLog(LogLevel.INFO, `Switching transport to ${newTransport}`);

      if (this.transport === newTransport)
      {
        debugStore.addLog(LogLevel.INFO, `Transport is already ${newTransport}, no action taken`);
        return;
      }

      let transportSwitchListener: any;
      transportSwitchListener = this.emitter.on(GlobalEmitterEnum.MESSAGE, (message: StatusResponse) =>
      {
        if (message.transport === newTransport)
        {
          this.transport = newTransport;
          if (transportSwitchListener) {
            transportSwitchListener();
            transportSwitchListener = null;
          }
          if (newTransport === TransportTypeEnum.WIFI) {
            wsStore.connect(`ws://${message.ipAddress}:${WEBSOCKET_PORT}`)
          } else if (newTransport === TransportTypeEnum.REMOTE && serverAddress) {
            wsStore.connect(`${serverAddress}/pair?id=${deviceId}`)
          }
          debugStore.addLog(LogLevel.INFO, `Transport switched to ${newTransport}`);
        }
      })

      this.send({ requestType: RequestEnum.SWITCH_TRANSPORT, transport: newTransport, serverAddress, deviceId });
    },
    startStatusPolling()
    {
      const debugStore = useDebugStore();

      if (this.pollingInterval)
      {
        debugStore.addLog(LogLevel.INFO, `Status polling already running`);
        return;
      }

      debugStore.addLog(LogLevel.INFO, `Starting status polling listener`);

      this.listener = this.emitter.on(GlobalEmitterEnum.MESSAGE, (message: StatusResponse) =>
      {
        this.status = message;
      })

      this.pollingInterval = window.setInterval(() =>
      {
        this.requestStatus()
      }, STATUS_REQUEST_INTERVAL);

      this.requestStatus()
    },
    stopStatusPolling()
    {
      const debugStore = useDebugStore();

      if (this.listener)
      {
        debugStore.addLog(LogLevel.INFO, `Stopping status polling listener`);
        try {
          this.listener();
        } catch (e) {
          this.emitter.off(GlobalEmitterEnum.MESSAGE, this.listener as any);
        }
        this.listener = null;
      }

      if (this.pollingInterval)
      {
        debugStore.addLog(LogLevel.INFO, `Clearing status polling interval`);
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }
    },
    send(payload: any)
    {
      const bleStore = useBleStore();
      const wsStore = useWebSocketStore();

      switch (this.transport)
      {
        case TransportTypeEnum.BLE:
          bleStore.send(payload);
          break;
        case TransportTypeEnum.WIFI:
        case TransportTypeEnum.REMOTE:
          wsStore.send(JSON.stringify(payload));
          break;
      }
    },
    initialize()
    {
      const debugStore = useDebugStore();
      const bleStore = useBleStore();
      const wsStore = useWebSocketStore();

      debugStore.addLog(LogLevel.INFO, `Initializing vibrator store listeners`);

      bleStore.emitter.on(BLEEmitterEnum.NOTIFICATION, (data) =>
      {
        this.emitter.emit(GlobalEmitterEnum.MESSAGE, data);
      });

      wsStore.emitter.on(WiFiEmitterEnum.MESSAGE, (message) =>
      {
        this.emitter.emit(GlobalEmitterEnum.MESSAGE, message);
      });
    },
    setIntensity(intensity: number)
    {
      this.stopStatusPolling();
      this.send({ requestType: RequestEnum.INTENSITY, intensity });
      this.startStatusPolling();
    },
    setWiFiCredentials(ssid: string, password: string)
    {
      this.send({ requestType: RequestEnum.WIFI_CREDENTIALS, ssid, password });
    },
    requestStatus()
    {
      this.send({ requestType: RequestEnum.STATUS });
    }
  },
});