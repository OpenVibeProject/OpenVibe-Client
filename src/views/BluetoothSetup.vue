<script setup lang="ts">
import { ref, onMounted, onUnmounted, Ref } from 'vue';
import { useRouter } from 'vue-router';
import { useBleStore } from '@/stores/ble';
import { useDebugStore } from '@/stores/debug';
import { IonPage, IonContent } from '@ionic/vue';
import { BleClient, ScanResult } from '@capacitor-community/bluetooth-le';
import MaterialSymbolsBluetooth from '~icons/material-symbols/bluetooth';
import { LogLevel } from '@/types/LogLevel';

const isBluetoothAvailable = ref(false);

const devices = ref<ScanResult[]>([]) as Ref<ScanResult[]>;

const isScanning = ref(false);
const isConnecting = ref(false);
const targetFound = ref(false);
const targetPrefix = 'OpenVibe';

const bleStore = useBleStore();
const debugStore = useDebugStore();
const router = useRouter();

let rescanTimer: number | undefined;
let scanTimeout: number | undefined;
const RESCAN_DELAY_MS = 3000;
const SCAN_TIMEOUT_MS = 10000;

const scanForDevices = async () =>
{
    if (isScanning.value || isConnecting.value) return;

    try
    {
        isScanning.value = true;
        devices.value = [];
        targetFound.value = false;

    await BleClient.initialize();

    debugStore.addLog(LogLevel.DEBUG, 'Starting BLE scan');

        await BleClient.requestLEScan({}, (result) =>
        {
            if (!devices.value.find(d => d.device.deviceId === result.device.deviceId))
            {
                devices.value.push(result);
                const name = (result.localName ?? result.device?.name ?? result.device.deviceId).toString();
                debugStore.addLog(LogLevel.DEBUG, `Bluetooth: found device ${name} (${result.device.deviceId}) rssi=${result.rssi}`);
            }

            // verifica se è il dispositivo target
            const name = (result.localName ?? result.device?.name ?? '').toString();
            if (!targetFound.value && name.startsWith(targetPrefix))
            {
                targetFound.value = true;
                (async () =>
                {
                    try
                    {
                        try { await BleClient.stopLEScan(); } catch (e) {}
                        if (scanTimeout) { clearTimeout(scanTimeout); scanTimeout = undefined; }
                        if (rescanTimer) { clearTimeout(rescanTimer); rescanTimer = undefined; }
                    } catch (e) {
                        // ignora
                    }
                    isScanning.value = false;
                    isConnecting.value = true;
                    await connectToDevice(result);
                })();
            }
        });

        // timeout generale di scansione (ferma se non troviamo il target)
        scanTimeout = window.setTimeout(async () =>
        {
            if (isScanning.value)
            {
                try { await BleClient.stopLEScan(); } catch (e) {}
                isScanning.value = false;
                debugStore.addLog(LogLevel.DEBUG, `Scan timed out - scheduling rescan in ${RESCAN_DELAY_MS/1000}s`);

                // se non abbiamo trovato il target, pianifica un nuovo tentativo dopo un breve ritardo
                if (!targetFound.value && !isConnecting.value)
                {
                    rescanTimer = window.setTimeout(async () =>
                    {
                        if (!isScanning.value && !isConnecting.value)
                        {
                            debugStore.addLog(LogLevel.DEBUG, 'Rescanning for OpenVibe devices');
                            await scanForDevices();
                        }
                    }, RESCAN_DELAY_MS);
                }
            }
        }, SCAN_TIMEOUT_MS);
    } catch (error)
    {
        console.error('Bluetooth scan error:', error);
        isScanning.value = false;
    }
};

const connectToDevice = async (device: ScanResult) =>
{
    try
    {
        const deviceId = device.device.deviceId;
        const ok = await bleStore.connectToDevice(deviceId, device);
        isConnecting.value = false;
        if (ok) {
            router.push('/wifi-setup');
        } else {
            targetFound.value = false;
            await scanForDevices();
        }
    } catch (error)
    {
        isConnecting.value = false;
        targetFound.value = false;
        alert('Failed to connect: ' + error);
        console.error('Failed to connect:', error);
        await scanForDevices();
    }
};

const checkBluetoothAvailability = async () => {
    try {
        await BleClient.initialize();
        const isEnabled = await BleClient.isEnabled();
        isBluetoothAvailable.value = isEnabled;
        return isEnabled;
    } catch (error) {
        isBluetoothAvailable.value = false;
        return false;
    }
};

let bluetoothCheckInterval: number;

onMounted(async () => {
    await checkBluetoothAvailability();
    
    bluetoothCheckInterval = setInterval(async () => {
        const wasAvailable = isBluetoothAvailable.value;
        const isAvailable = await checkBluetoothAvailability();
        
        if (!wasAvailable && isAvailable) {
            await scanForDevices();
        }
    }, 1000);
    
    if (isBluetoothAvailable.value) {
        await scanForDevices();
    }
});

onUnmounted(() => {
    if (bluetoothCheckInterval) {
        clearInterval(bluetoothCheckInterval);
    }
    if (isScanning.value) {
        BleClient.stopLEScan().catch(()=>{});
    }
    if (scanTimeout) { clearTimeout(scanTimeout); scanTimeout = undefined; }
    if (rescanTimer) { clearTimeout(rescanTimer); rescanTimer = undefined; }
});
</script>

<template>
    <ion-page>
        <ion-content class="ion-padding-top">
            <div class="flex flex-col w-5/6 mx-auto gap-8 mt-[15vh]">
                <div class="text-center">
                    <h1 class="text-3xl font-bold mb-5">Let's get started</h1>
                    <p class="text-lg text-gray-400">First we’ll connect to your device using bluetooth</p>
                </div>
                <div class="search-container flex flex-col gap-15 justify-center items-center">
                    <div class="bluetooth-search mx-auto mt-[10vh] rounded-full p-5" :class="isBluetoothAvailable ? '' : 'disabled'">
                        <MaterialSymbolsBluetooth class="text-[10rem]" 
                        :class="isBluetoothAvailable ? 'text-blue-500' : 'text-gray-500'" />
                    </div>

                    <p v-if="!isBluetoothAvailable" class="text-xl">Please turn on the bluetooth</p>
                    <p v-else class="text-xl">We're looking for your device</p>
                </div>
            </div>
        </ion-content>
    </ion-page>
</template>

<style scoped>
.bluetooth-search {
    animation: pulse 2s infinite;
}

.disabled {
    background-color: #4d4d4d60;
    box-shadow: 0px 0px 10px #4d4d4d60;
    border: #626262 1px solid;
    animation: none;
}

@keyframes pulse {
    0% {
        background-color: #4d4d4d60;
        box-shadow: 0px 0px 10px #4d4d4d60;
        border: #626262 1px solid;
    }

    50% {
        background-color: #2b6eff50;
        box-shadow: 0px 0px 50px #3373ff;
        border: #3373ff 1px solid;
    }

    100% {
        background-color: #4d4d4d60;
        box-shadow: 0px 0px 10px #4d4d4d60;
        border: #626262 1px solid;
    }
}
</style>
