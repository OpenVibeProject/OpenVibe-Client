import { defineStore } from 'pinia';
import { Ref, ref } from 'vue';
import type { ScanResult } from '@capacitor-community/bluetooth-le';
import { BleClient } from '@capacitor-community/bluetooth-le';
import { BLEEnum } from '@/types/BLEEnum';
import { useDebugStore } from '@/stores/debug';
import { useAppStore } from '@/stores/app';
import { LogLevel } from '@/types/LogLevel';
import { Emitter } from '@/utils/Emitter';
import { TARGET_DEVICE_NAME_PREFIX } from '@/constants';
import { BLEEmitterEnum } from '@/types/BLEEmitterEnum';

export const useBleStore = defineStore('ble', {
  state: () => ({
    device: ref(null) as Ref<ScanResult | null>,
    emitter: new Emitter()
  }),
  getters: {
    deviceId(): string | null { return (this.device as ScanResult | null)?.device?.deviceId ?? null },
    isBluetoothAvailable(): Promise<boolean> { return BleClient.isEnabled() },
  },
  actions: {
    async scan()
    {
      const debugStore = useDebugStore()
      const appStore = useAppStore()

      if (appStore.lastConnectedDeviceId) {
        const connected = await this.connect({ device: { deviceId: appStore.lastConnectedDeviceId } } as ScanResult);
        if (connected) {
          return;
        }
      }

      BleClient.requestLEScan({}, async (result) =>
      {
        const name = (result.localName ?? result.device?.name ?? result.device.deviceId).toString()
        debugStore.addLog(LogLevel.DEBUG, `Bluetooth: found device ${name} (${result.device.deviceId}) rssi=${result.rssi}`)
        if (name.startsWith(TARGET_DEVICE_NAME_PREFIX)) {
          await BleClient.stopLEScan()
          await this.connect(result)
        }
        }
      );
    },
    async connect(scanResult: ScanResult)
    {
      const debugStore = useDebugStore()
      const appStore = useAppStore()

      const deviceId = scanResult?.device.deviceId ?? this.deviceId;
      debugStore.addLog(LogLevel.DEBUG, `BLE Connecting to: ${deviceId}`);
      try
      {
        await BleClient.connect(deviceId, async () =>
        {
          await BleClient.stopNotifications(deviceId, BLEEnum.SERVICE_UUID, BLEEnum.NOTIFY_CHARACTERISTIC_UUID);

          this.device = null;
          this.emitter.emit(BLEEmitterEnum.DISCONNECTED);
          debugStore.addLog(LogLevel.WARN, `BLE Disconnected from: ${deviceId}`);
        })

        debugStore.addLog(LogLevel.INFO, `BLE Connected to: ${deviceId}`);
        this.device = scanResult
        this.emitter.emit(BLEEmitterEnum.CONNECTED, deviceId);
        appStore.setLastConnectedDevice(deviceId);

        await BleClient.startNotifications(deviceId, BLEEnum.SERVICE_UUID, BLEEnum.NOTIFY_CHARACTERISTIC_UUID,
          (value: DataView) =>
          {
            const notificationData = JSON.parse(new TextDecoder().decode(new Uint8Array(value.buffer)))
            this.emitter.emit(BLEEmitterEnum.NOTIFICATION, notificationData)
            debugStore.addLog(LogLevel.DEBUG, `BLE Notification: ${JSON.stringify(notificationData)}`)
          })
        return true;
      } catch (e)
      {
        debugStore.addLog(LogLevel.ERROR, `BLE Connection error to ${deviceId}: ${String(e)}`);
        return false;
      }
    },
    async send(payload: any)
    {
      const debugStore = useDebugStore();
      if (!this.deviceId)
      {
        debugStore.addLog(LogLevel.ERROR, 'BLE send called with no deviceId');
        return;
      }

      let uint8: Uint8Array;
      if (payload instanceof Uint8Array) {
        uint8 = payload;
      } else if (payload instanceof ArrayBuffer) {
        uint8 = new Uint8Array(payload);
      } else if (typeof payload === 'string') {
        uint8 = new TextEncoder().encode(payload);
      } else {
        uint8 = new TextEncoder().encode(JSON.stringify(payload));
      }

      try
      {
        debugStore.addLog(LogLevel.DEBUG, `BLE send to ${this.deviceId}: ${typeof payload === 'string' ? payload : '[binary/object]'}`);
        await BleClient.write(this.deviceId as string, BLEEnum.SERVICE_UUID, BLEEnum.CHARACTERISTIC_UUID, new DataView(uint8.buffer));
        debugStore.addLog(LogLevel.INFO, `BLE send succeeded to ${this.deviceId}`);
      } catch (e)
      {
        debugStore.addLog(LogLevel.ERROR, `BLE send error: ${String(e)}`);
        throw e;
      }
    }
  }
})