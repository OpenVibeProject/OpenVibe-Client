<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useBleStore } from '@/stores/ble';
import { IonPage, IonContent } from '@ionic/vue';
import { BleClient, ScanResult } from '@capacitor-community/bluetooth-le';
import MaterialSymbolsBluetooth from '~icons/material-symbols/bluetooth';

const isBluetoothAvailable = ref(false);

const devices = ref<ScanResult[]>([
    {
        device: { deviceId: 'AA:BB:CC:DD:EE:01', name: 'iPhone 15 Pro' },
        localName: 'iPhone 15 Pro',
        rssi: -45
    },
    {
        device: { deviceId: 'AA:BB:CC:DD:EE:02', name: 'AirPods Pro' },
        localName: 'AirPods Pro',
        rssi: -32
    },
    {
        device: { deviceId: 'AA:BB:CC:DD:EE:03', name: 'Samsung Galaxy Watch' },
        localName: 'Samsung Galaxy Watch',
        rssi: -67
    },
    {
        device: { deviceId: 'AA:BB:CC:DD:EE:04', name: 'Sony WH-1000XM4' },
        localName: 'Sony WH-1000XM4',
        rssi: -28
    },
    {
        device: { deviceId: 'AA:BB:CC:DD:EE:05', name: 'Fitbit Charge 5' },
        localName: 'Fitbit Charge 5',
        rssi: -55
    },
    {
        device: { deviceId: 'AA:BB:CC:DD:EE:04', name: 'Sony WH-1000XM4' },
        localName: 'Sony WH-1000XM4',
        rssi: -28
    },
    {
        device: { deviceId: 'AA:BB:CC:DD:EE:05', name: 'Fitbit Charge 5' },
        localName: 'Fitbit Charge 5',
        rssi: -55
    },
    {
        device: { deviceId: 'AA:BB:CC:DD:EE:04', name: 'Sony WH-1000XM4' },
        localName: 'Sony WH-1000XM4',
        rssi: -28
    },
    {
        device: { deviceId: 'AA:BB:CC:DD:EE:05', name: 'Fitbit Charge 5' },
        localName: 'Fitbit Charge 5',
        rssi: -55
    }
] as ScanResult[]);
const isScanning = ref(false);

const bleStore = useBleStore();
const router = useRouter();

const scanForDevices = async () =>
{
    try
    {
        isScanning.value = true;
        devices.value = [];

        await BleClient.initialize();

        await BleClient.requestLEScan({}, (result) =>
        {
            if (!devices.value.find(d => d.device.deviceId === result.device.deviceId))
            {
                devices.value.push(result);
            }
        });

        setTimeout(async () =>
        {
            await BleClient.stopLEScan();
            isScanning.value = false;
        }, 5000);
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
        await BleClient.connect(deviceId);
        bleStore.setConnection(deviceId, device);
        router.push('/wifi-setup');
    } catch (error)
    {
        alert('Failed to connect: ' + error);
        console.error('Failed to connect:', error);
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
                    <p v-if="isBluetoothAvailable" class="text-xl">We're searching your device</p>
                    <p v-else class="text-xl">Please turn on the bluetooth</p>
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
