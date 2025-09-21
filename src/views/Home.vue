<script setup lang="ts">
import { ref, onMounted } from 'vue';
import LiquidGauge from '../components/LiquidGauge.vue';
import { BleClient, ScanResult } from '@capacitor-community/bluetooth-le';

const percentage = ref(100);
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
    }
] as ScanResult[]);
const isScanning = ref(false);

setInterval(() =>
{
    percentage.value = percentage.value - 1;
}, 100);

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

onMounted(async () =>
{
    try
    {
        await BleClient.initialize();
        await scanForDevices();
    } catch (error)
    {
        console.error('Bluetooth initialization error:', error);
    }
});

</script>

<template>
    <div class="flex flex-col justify-center items-center h-[100vh] gap-8">
        <LiquidGauge :percentage="percentage" />

        <div class="rounded-lg shadow-lg p-6 w-full h-100 overflow-y-auto">
            <div v-if="devices.length > 0" class="space-y-2">
                <div v-for="device in devices" :key="device.device.deviceId" class="p-2 bg-zinc-900 rounded">
                    <div class="font-medium">{{ device.device.name || device.localName || 'Unknown Device' }}</div>
                    <div class="text-sm">{{ device.device.deviceId }}</div>
                    <div v-if="device.rssi" class="text-xs">Signal: {{ device.rssi }} dBm</div>
                </div>
            </div>

            <p v-else-if="!isScanning" class="text-gray-500 text-sm">
                No devices found. Click scan to search for Bluetooth devices.
            </p>
        </div>
    </div>

</template>

<style scoped></style>
