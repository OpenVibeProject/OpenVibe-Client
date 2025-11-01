import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ScanResult } from '@capacitor-community/bluetooth-le';
import { BleClient } from '@capacitor-community/bluetooth-le';
import { BLEEnum } from '@/types/BLEEnum';
import { useDebugStore } from '@/stores/debug';

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

  // debug store for internal logging
  const debugStore = useDebugStore();

  let notificationUnsub: (() => Promise<void>) | null = null;

  function setConnection(id: string, scanResult: ScanResult | null = null) {
    deviceId.value = id;
    if (scanResult) device.value = scanResult;
    isConnected.value = true;
    debugStore.addLog('info', `BLE connected: ${id}`);
    emitter.emit('connected', { deviceId: id, scanResult });
  }

  function clearConnection() {
    const prev = deviceId.value;
    deviceId.value = null;
    device.value = null;
    isConnected.value = false;
    debugStore.addLog('info', `BLE disconnected: ${prev ?? 'unknown'}`);
    emitter.emit('disconnected');
  }

  async function connectToDevice(id: string, scanResult?: ScanResult) {
    debugStore.addLog('debug', `connectToDevice start: ${id}`);
    try {
      await BleClient.initialize();
      debugStore.addLog('debug', 'BleClient.initialize() returned');
      // connect and set store state
      await BleClient.connect(id, (d) => {
        // disconnected callback from plugin
        debugStore.addLog('warn', `BleClient reported disconnect for ${id}`);
        clearConnection();
      });
      debugStore.addLog('info', `BleClient.connect succeeded: ${id}`);
      setConnection(id, scanResult ?? null);
      // after connect, start notifications on the notify characteristic
      await startNotifications();
      debugStore.addLog('debug', `connectToDevice complete: ${id}`);
      return true;
    } catch (e) {
      debugStore.addLog('error', `connectToDevice failed: ${String(e)}`);
      emitter.emit('error', { op: 'connect', error: e });
      return false;
    }
  }

  async function disconnect() {
    debugStore.addLog('debug', 'disconnect called');
    try {
      if (notificationUnsub) {
        debugStore.addLog('debug', 'calling notificationUnsub()');
        await notificationUnsub();
        notificationUnsub = null;
      }
      if (deviceId.value) {
        debugStore.addLog('debug', `BleClient.disconnect(${deviceId.value})`);
        await BleClient.disconnect(deviceId.value);
        debugStore.addLog('info', `BleClient.disconnect succeeded: ${deviceId.value}`);
      }
    } catch (e) {
      debugStore.addLog('warn', `disconnect error: ${String(e)}`);
      // ignore
    } finally {
      clearConnection();
    }
  }

  async function startNotifications() {
    if (!deviceId.value) {
      debugStore.addLog('error', 'startNotifications called with no deviceId');
      emitter.emit('error', { op: 'startNotifications', error: 'no-device' });
      return;
    }
    debugStore.addLog('debug', `startNotifications start for ${deviceId.value}`);
    // Diagnostic: log services/characteristics visible to the plugin prior to subscribing
    try {
      const svcs = await BleClient.getServices(deviceId.value!);
      try { debugStore.addLog('debug', `getServices: ${JSON.stringify(svcs)}`); } catch { /* ignore stringify issues */ }
      // Also print to console so we can see it in logcat/device logs
      // eslint-disable-next-line no-console
      console.log('[BLE store] getServices:', svcs);
    } catch (svcErr) {
      debugStore.addLog('warn', `getServices failed: ${String(svcErr)}`);
      // eslint-disable-next-line no-console
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
          debugStore.addLog('debug', `stopNotifications succeeded for ${deviceId.value}`);
        } catch (e) {
          debugStore.addLog('warn', `stopNotifications error: ${String(e)}`);
          // ignore
        }
      };
      debugStore.addLog('info', `Subscribed to notifications on ${deviceId.value}`);
      emitter.emit('notifying', { deviceId: deviceId.value });
      // also log to console for immediate visibility
      // eslint-disable-next-line no-console
      console.log(`[BLE store] Subscribed to notifications on ${deviceId.value}`);
    } catch (e) {
      // attempt CCCD write fallback
      debugStore.addLog('warn', `startNotifications failed, attempting CCCD fallback: ${String(e)}`);
      emitter.emit('warn', { op: 'startNotifications', error: e });
      try {
        const cccd = '00002902-0000-1000-8000-00805f9b34fb';
        const enableNotif = new DataView(new Uint8Array([0x01, 0x00]).buffer);
        debugStore.addLog('debug', `writeDescriptor CCCD (${cccd}) on ${BLEEnum.NOTIFY_CHARACTERISTIC_UUID}`);
        await BleClient.writeDescriptor(deviceId.value!, BLEEnum.SERVICE_UUID, BLEEnum.NOTIFY_CHARACTERISTIC_UUID, cccd, enableNotif);
        debugStore.addLog('info', 'Wrote CCCD to enable notifications, retrying startNotifications');
        await BleClient.startNotifications(deviceId.value!, BLEEnum.SERVICE_UUID, BLEEnum.NOTIFY_CHARACTERISTIC_UUID, (v) => handleNotification(v));
        notificationUnsub = async () => {
          try { await BleClient.stopNotifications(deviceId.value!, BLEEnum.SERVICE_UUID, BLEEnum.NOTIFY_CHARACTERISTIC_UUID); } catch (err) { debugStore.addLog('warn', `stopNotifications fallback error: ${String(err)}`); }
        };
        debugStore.addLog('info', `Subscribed to notifications (after CCCD) on ${deviceId.value}`);
        emitter.emit('notifying', { deviceId: deviceId.value });
        // also log to console
        // eslint-disable-next-line no-console
        console.log(`[BLE store] Subscribed to notifications (after CCCD) on ${deviceId.value}`);
      } catch (err) {
        debugStore.addLog('error', `Failed to enable notifications via CCCD fallback: ${String(err)}`);
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
      debugStore.addLog('warn', `parseNotificationValue error: ${String(e)}`);
      return { raw: null };
    }
  }

  function handleNotification(value: any) {
    try {
      // log raw value to debug store and console
      debugStore.addLog('debug', `handleNotification raw value: ${String(value?.value ?? value)}`);
      // eslint-disable-next-line no-console
      console.log('[BLE store] handleNotification raw:', value?.value ?? value);
    } catch (e) {
      // ignore logging error
    }
    const out = parseNotificationValue(value);
    try {
      debugStore.addLog('debug', `handleNotification parsed: ${JSON.stringify(out)}`);
      // eslint-disable-next-line no-console
      console.log('[BLE store] handleNotification parsed:', out);
    } catch (e) {
      // ignore
    }
    emitter.emit('notification', out);
  }

  async function writeCharacteristic(payload: string | Uint8Array) {
    if (!deviceId.value) {
      debugStore.addLog('error', 'writeCharacteristic called with no deviceId');
      throw new Error('no-device');
    }
    const buf = typeof payload === 'string' ? new TextEncoder().encode(payload) : payload;
    try {
      debugStore.addLog('debug', `writeCharacteristic to ${deviceId.value}: ${typeof payload === 'string' ? payload : '[binary]'}`);
      await BleClient.write(deviceId.value, BLEEnum.SERVICE_UUID, BLEEnum.CHARACTERISTIC_UUID, new DataView((buf as Uint8Array).buffer));
      debugStore.addLog('info', `writeCharacteristic succeeded to ${deviceId.value}`);
    } catch (e) {
      debugStore.addLog('error', `writeCharacteristic error: ${String(e)}`);
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
