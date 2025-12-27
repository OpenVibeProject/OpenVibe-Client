import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ScanResult } from '@capacitor-community/bluetooth-le';
import { BleClient } from '@capacitor-community/bluetooth-le';
import { BLEEnum } from '@/types/BLEEnum';
import { useDebugStore } from '@/stores/debug';
import { useAppStore } from '@/stores/app';
import { LogLevel } from '@/types/LogLevel';
import { Emitter } from '@/utils/Emitter';
import { BLE_MAX_RECONNECT_ATTEMPTS, BLE_MAX_RECONNECT_DELAY } from '@/constants';

export const useBleStore = defineStore('ble', () =>
{
  const deviceId = ref<string | null>(null);
  const device = ref<ScanResult | null>(null);
  const isConnected = ref(false);
  const emitter = new Emitter();

  const debugStore = useDebugStore();
  const appStore = useAppStore();

  let notificationUnsub: (() => Promise<void>) | null = null;
  let reconnectTimer: number | null = null;
  let reconnectAttempts = 0;

  function setConnection(id: string, scanResult: ScanResult | null = null)
  {
    deviceId.value = id;
    if (scanResult) device.value = scanResult;
    isConnected.value = true;
    appStore.setLastConnectedDevice(id);
    stopReconnection(); // Stop any ongoing reconnection attempts
    debugStore.addLog(LogLevel.INFO, `BLE connected: ${id}`);
    emitter.emit('connected', { deviceId: id, scanResult });
  }

  function clearConnection()
  {
    const prev = deviceId.value;
    deviceId.value = null;
    device.value = null;
    isConnected.value = false;
    debugStore.addLog(LogLevel.INFO, `BLE disconnected: ${prev ?? 'unknown'}`);
    emitter.emit('disconnected');

    if (appStore.lastConnectedDeviceId && reconnectAttempts < BLE_MAX_RECONNECT_ATTEMPTS)
    {
      startReconnection();
    }
  }

  function startReconnection()
  {
    if (reconnectTimer) clearTimeout(reconnectTimer);

    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), BLE_MAX_RECONNECT_DELAY);
    debugStore.addLog(LogLevel.INFO, `Attempting reconnection in ${delay}ms (attempt ${reconnectAttempts + 1}/${BLE_MAX_RECONNECT_ATTEMPTS})`);

    reconnectTimer = setTimeout(async () =>
    {
      reconnectAttempts++;
      if (appStore.lastConnectedDeviceId)
      {
        await connectToDevice(appStore.lastConnectedDeviceId);
        if (isConnected.value)
        {
          reconnectAttempts = 0;
        }
      }
    }, delay);
  }

  function stopReconnection()
  {
    if (reconnectTimer)
    {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    reconnectAttempts = 0;
  }

  async function connectToDevice(id: string, scanResult?: ScanResult)
  {
    debugStore.addLog(LogLevel.DEBUG, `connectToDevice start: ${id}`);
    try
    {
      await BleClient.initialize({ androidNeverForLocation: true });
      debugStore.addLog(LogLevel.DEBUG, 'BleClient.initialize() returned');
      await BleClient.connect(id, () =>
      {
        debugStore.addLog(LogLevel.WARN, `BleClient reported disconnect for ${id}`);
        clearConnection();
      });
      debugStore.addLog(LogLevel.INFO, `BleClient.connect succeeded: ${id}`);
      setConnection(id, scanResult ?? null);
      await startNotifications();
      debugStore.addLog(LogLevel.DEBUG, `connectToDevice complete: ${id}`);

      return true;
    } catch (e)
    {
      debugStore.addLog(LogLevel.ERROR, `connectToDevice failed: ${String(e)}`);
      emitter.emit('error', { op: 'connect', error: e });
      return false;
    }
  }

  async function disconnect()
  {
    debugStore.addLog(LogLevel.DEBUG, 'disconnect called');
    stopReconnection();
    try
    {
      if (notificationUnsub)
      {
        debugStore.addLog(LogLevel.DEBUG, 'calling notificationUnsub()');
        await notificationUnsub();
        notificationUnsub = null;
      }
      if (deviceId.value)
      {
        debugStore.addLog(LogLevel.DEBUG, `BleClient.disconnect(${deviceId.value})`);
        await BleClient.disconnect(deviceId.value);
        debugStore.addLog(LogLevel.INFO, `BleClient.disconnect succeeded: ${deviceId.value}`);
      }
    } catch (e)
    {
      debugStore.addLog(LogLevel.WARN, `disconnect error: ${String(e)}`);
    } finally
    {
      const prev = deviceId.value;
      deviceId.value = null;
      device.value = null;
      isConnected.value = false;
      debugStore.addLog(LogLevel.INFO, `BLE disconnected: ${prev ?? 'unknown'}`);
      emitter.emit('disconnected');
    }
  }

  async function startNotifications()
  {
    if (!deviceId.value)
    {
      debugStore.addLog(LogLevel.ERROR, 'startNotifications called with no deviceId');
      emitter.emit('error', { op: 'startNotifications', error: 'no-device' });
      return;
    }
    await BleClient.startNotifications(
      deviceId.value,
      BLEEnum.SERVICE_UUID,
      BLEEnum.NOTIFY_CHARACTERISTIC_UUID,
      (v) => handleNotification(v)
    );
    notificationUnsub = async () =>
    {
      try
      {
        await BleClient.stopNotifications(deviceId.value!, BLEEnum.SERVICE_UUID, BLEEnum.NOTIFY_CHARACTERISTIC_UUID);
        debugStore.addLog(LogLevel.DEBUG, `BLE stopNotifications succeeded for ${deviceId.value}`);
      } catch (e)
      {
        debugStore.addLog(LogLevel.WARN, `BLE stopNotifications error: ${String(e)}`);
      }
    };
    debugStore.addLog(LogLevel.INFO, `Subscribed to notifications on ${deviceId.value}`);
    emitter.emit('notifying', { deviceId: deviceId.value });
  }

  function parseNotificationValue(value: any)
  {
    try
    {
      const data = value && (value.value ?? value);
      let buffer: ArrayBuffer | null = null;
      if (!data) return { raw: null };
      if (data instanceof DataView) buffer = (data as DataView).buffer as ArrayBuffer;
      else if (data instanceof ArrayBuffer) buffer = data as ArrayBuffer;
      else if ((data as any).buffer) buffer = (data as any).buffer as ArrayBuffer;
      if (!buffer) return { raw: null };
      const decoder = new TextDecoder();
      const raw = decoder.decode(buffer);
      const parsed = JSON.parse(raw);
      return { raw, parsed };
    } catch (e)
    {
      debugStore.addLog(LogLevel.WARN, `BLE parseNotificationValue error: ${String(e)}`);
      return { raw: null };
    }
  }

  function handleNotification(value: any)
  {
    const out = parseNotificationValue(value);
    debugStore.addLog(LogLevel.DEBUG, `handleNotification parsed: ${JSON.stringify(out)}`);
    emitter.emit('notification', out);
  }

  async function send(payload: string | Uint8Array)
  {
    if (!deviceId.value)
    {
      debugStore.addLog(LogLevel.ERROR, 'BLE send called with no deviceId');
      throw new Error('no-device');
    }
    const buf = typeof payload === 'string' ? new TextEncoder().encode(payload) : payload;
    try
    {
      debugStore.addLog(LogLevel.DEBUG, `BLE send to ${deviceId.value}: ${typeof payload === 'string' ? payload : '[binary]'}`);
      await BleClient.write(deviceId.value, BLEEnum.SERVICE_UUID, BLEEnum.CHARACTERISTIC_UUID, new DataView((buf as Uint8Array).buffer));
      debugStore.addLog(LogLevel.INFO, `BLE send succeeded to ${deviceId.value}`);
    } catch (e)
    {
      debugStore.addLog(LogLevel.ERROR, `BLE send error: ${String(e)}`);
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
    writeCharacteristic: send,
    on: emitter.on.bind(emitter),
    off: emitter.off.bind(emitter),
    emit: emitter.emit.bind(emitter)
  };
});
