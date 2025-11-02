import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ScanResult } from '@capacitor-community/bluetooth-le';
import { BleClient } from '@capacitor-community/bluetooth-le';
import { BLEEnum } from '@/types/BLEEnum';
import { useDebugStore } from '@/stores/debug';
import { LogLevel } from '@/types/LogLevel';

type Listener = (payload?: any) => void;

class Emitter {
  private listeners = new Map<string, Set<Listener>>();
  on(event: string, fn: Listener) {
    const s = this.listeners.get(event) ?? new Set();
    s.add(fn);
    this.listeners.set(event, s);
    return () => this.off(event, fn);
  }
  off(event: string, fn: Listener) {
    const s = this.listeners.get(event);
    if (!s) return;
    s.delete(fn);
    if (s.size === 0) this.listeners.delete(event);
  }
  emit(event: string, payload?: any) {
    const s = this.listeners.get(event);
    if (!s) return;
    for (const fn of Array.from(s)) fn(payload);
  }
}

export const useBleStore = defineStore('ble', () => {
  const deviceId = ref<string | null>(null);
  const device = ref<ScanResult | null>(null);
  const isConnected = ref(false);
  const emitter = new Emitter();

  const debugStore = useDebugStore();

  let notificationUnsub: (() => Promise<void>) | null = null;

  function setConnection(id: string, scanResult: ScanResult | null = null) {
    deviceId.value = id;
    if (scanResult) device.value = scanResult;
    isConnected.value = true;
    debugStore.addLog(LogLevel.INFO, `BLE connected: ${id}`);
    emitter.emit('connected', { deviceId: id, scanResult });
  }

  function clearConnection() {
    const prev = deviceId.value;
    deviceId.value = null;
    device.value = null;
    isConnected.value = false;
    debugStore.addLog(LogLevel.INFO, `BLE disconnected: ${prev ?? 'unknown'}`);
    emitter.emit('disconnected');
  }

  async function connectToDevice(id: string, scanResult?: ScanResult) {
    debugStore.addLog(LogLevel.DEBUG, `connectToDevice start: ${id}`);
    try {
      await BleClient.initialize();
      debugStore.addLog(LogLevel.DEBUG, 'BleClient.initialize() returned');
      await BleClient.connect(id, () => {
        debugStore.addLog(LogLevel.WARN, `BleClient reported disconnect for ${id}`);
        clearConnection();
      });
      debugStore.addLog(LogLevel.INFO, `BleClient.connect succeeded: ${id}`);
      setConnection(id, scanResult ?? null);
      await startNotifications();
      debugStore.addLog(LogLevel.DEBUG, `connectToDevice complete: ${id}`);
      return true;
    } catch (e) {
      debugStore.addLog(LogLevel.ERROR, `connectToDevice failed: ${String(e)}`);
      emitter.emit('error', { op: 'connect', error: e });
      return false;
    }
  }

  async function disconnect() {
    debugStore.addLog(LogLevel.DEBUG, 'disconnect called');
    try {
      if (notificationUnsub) {
        debugStore.addLog(LogLevel.DEBUG, 'calling notificationUnsub()');
        await notificationUnsub();
        notificationUnsub = null;
      }
      if (deviceId.value) {
        debugStore.addLog(LogLevel.DEBUG, `BleClient.disconnect(${deviceId.value})`);
        await BleClient.disconnect(deviceId.value);
        debugStore.addLog(LogLevel.INFO, `BleClient.disconnect succeeded: ${deviceId.value}`);
      }
    } catch (e) {
      debugStore.addLog(LogLevel.WARN, `disconnect error: ${String(e)}`);
    } finally {
      clearConnection();
    }
  }

  async function startNotifications() {
    if (!deviceId.value) {
      debugStore.addLog(LogLevel.ERROR, 'startNotifications called with no deviceId');
      emitter.emit('error', { op: 'startNotifications', error: 'no-device' });
      return;
    }
    debugStore.addLog(LogLevel.DEBUG, `startNotifications start for ${deviceId.value}`);
    try {
      const svcs = await BleClient.getServices(deviceId.value!);
      try { debugStore.addLog(LogLevel.DEBUG, `getServices: ${JSON.stringify(svcs)}`); } catch { }
      console.log('[BLE store] getServices:', svcs);
    } catch (svcErr) {
      debugStore.addLog(LogLevel.WARN, `getServices failed: ${String(svcErr)}`);
      console.warn('[BLE store] getServices failed:', svcErr);
    }
    try {
      await BleClient.startNotifications(
        deviceId.value,
        BLEEnum.SERVICE_UUID,
        BLEEnum.NOTIFY_CHARACTERISTIC_UUID,
        (v) => handleNotification(v)
      );
      notificationUnsub = async () => {
        try {
          await BleClient.stopNotifications(deviceId.value!, BLEEnum.SERVICE_UUID, BLEEnum.NOTIFY_CHARACTERISTIC_UUID);
          debugStore.addLog(LogLevel.DEBUG, `stopNotifications succeeded for ${deviceId.value}`);
        } catch (e) {
          debugStore.addLog(LogLevel.WARN, `stopNotifications error: ${String(e)}`);
        }
      };
      debugStore.addLog(LogLevel.INFO, `Subscribed to notifications on ${deviceId.value}`);
      emitter.emit('notifying', { deviceId: deviceId.value });
      console.log(`[BLE store] Subscribed to notifications on ${deviceId.value}`);
    } catch (e) {
      debugStore.addLog(LogLevel.WARN, `startNotifications failed, attempting CCCD fallback: ${String(e)}`);
      emitter.emit('warn', { op: 'startNotifications', error: e });
      try {
        const cccd = '00002902-0000-1000-8000-00805f9b34fb';
        const enableNotif = new DataView(new Uint8Array([0x01, 0x00]).buffer);
        debugStore.addLog(LogLevel.DEBUG, `writeDescriptor CCCD (${cccd}) on ${BLEEnum.NOTIFY_CHARACTERISTIC_UUID}`);
        await BleClient.writeDescriptor(deviceId.value!, BLEEnum.SERVICE_UUID, BLEEnum.NOTIFY_CHARACTERISTIC_UUID, cccd, enableNotif);
        debugStore.addLog(LogLevel.INFO, 'Wrote CCCD to enable notifications, retrying startNotifications');
        await BleClient.startNotifications(deviceId.value!, BLEEnum.SERVICE_UUID, BLEEnum.NOTIFY_CHARACTERISTIC_UUID, (v) => handleNotification(v));
        notificationUnsub = async () => {
          try { await BleClient.stopNotifications(deviceId.value!, BLEEnum.SERVICE_UUID, BLEEnum.NOTIFY_CHARACTERISTIC_UUID); } catch (err) { debugStore.addLog(LogLevel.WARN, `stopNotifications fallback error: ${String(err)}`); }
        };
        debugStore.addLog(LogLevel.INFO, `Subscribed to notifications (after CCCD) on ${deviceId.value}`);
        emitter.emit('notifying', { deviceId: deviceId.value });
        console.log(`[BLE store] Subscribed to notifications (after CCCD) on ${deviceId.value}`);
      } catch (err) {
        debugStore.addLog(LogLevel.ERROR, `Failed to enable notifications via CCCD fallback: ${String(err)}`);
        emitter.emit('error', { op: 'startNotifications', error: err });
      }
    }
  }

  function parseNotificationValue(value: any) {
    try {
      const data = value && (value.value ?? value);
      let buffer: ArrayBuffer | null = null;
      if (!data) return { raw: null };
      if (data instanceof DataView) buffer = (data as DataView).buffer as ArrayBuffer;
      else if (data instanceof ArrayBuffer) buffer = data as ArrayBuffer;
      else if ((data as any).buffer) buffer = (data as any).buffer as ArrayBuffer;
      if (!buffer) return { raw: null };
      const decoder = new TextDecoder();
      const raw = decoder.decode(buffer);
      let parsed = null;
      try { parsed = JSON.parse(raw); } catch {}
      return { raw, parsed };
    } catch (e) {
      debugStore.addLog(LogLevel.WARN, `parseNotificationValue error: ${String(e)}`);
      return { raw: null };
    }
  }

  function handleNotification(value: any) {
    try {
      // log raw value to debug store and console
      debugStore.addLog(LogLevel.DEBUG, `handleNotification raw value: ${String(value?.value ?? value)}`);
      // eslint-disable-next-line no-console
      console.log('[BLE store] handleNotification raw:', value?.value ?? value);
    } catch (e) {
      // ignore logging error
    }
    const out = parseNotificationValue(value);
    try {
      debugStore.addLog(LogLevel.DEBUG, `handleNotification parsed: ${JSON.stringify(out)}`);
      // eslint-disable-next-line no-console
      console.log('[BLE store] handleNotification parsed:', out);
    } catch (e) {
      // ignore
    }
    emitter.emit('notification', out);
  }

  async function writeCharacteristic(payload: string | Uint8Array) {
    if (!deviceId.value) {
      debugStore.addLog(LogLevel.ERROR, 'writeCharacteristic called with no deviceId');
      throw new Error('no-device');
    }
    const buf = typeof payload === 'string' ? new TextEncoder().encode(payload) : payload;
    try {
      debugStore.addLog(LogLevel.DEBUG, `writeCharacteristic to ${deviceId.value}: ${typeof payload === 'string' ? payload : '[binary]'}`);
      await BleClient.write(deviceId.value, BLEEnum.SERVICE_UUID, BLEEnum.CHARACTERISTIC_UUID, new DataView((buf as Uint8Array).buffer));
      debugStore.addLog(LogLevel.INFO, `writeCharacteristic succeeded to ${deviceId.value}`);
    } catch (e) {
      debugStore.addLog(LogLevel.ERROR, `writeCharacteristic error: ${String(e)}`);
      throw e;
    }
  }

  return {
    deviceId,
    device,
    isConnected,
    setConnection,
    clearConnection,
    connectToDevice,
    disconnect,
    startNotifications,
    writeCharacteristic,
    on: (ev: string, fn: Listener) => emitter.on(ev, fn),
    off: (ev: string, fn: Listener) => emitter.off(ev, fn),
    emit: (ev: string, payload?: any) => emitter.emit(ev, payload)
  };
});
