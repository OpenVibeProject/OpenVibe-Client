<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/vue';
import { BleClient, ScanResult } from '@capacitor-community/bluetooth-le';

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

const scanForDevices = async () => {
    try {
        isScanning.value = true;
        devices.value = [];
        
        await BleClient.initialize();
        
        await BleClient.requestLEScan({}, (result) => {
            if (!devices.value.find(d => d.device.deviceId === result.device.deviceId)) {
                devices.value.push(result);
            }
        });
        
        setTimeout(async () => {
            await BleClient.stopLEScan();
            isScanning.value = false;
        }, 5000);
    } catch (error) {
        console.error('Bluetooth scan error:', error);
        isScanning.value = false;
    }
};

onMounted(async () => {
    try {
        await BleClient.initialize();
        await scanForDevices();
    } catch (error) {
        console.error('Bluetooth initialization error:', error);
    }
});
</script>

<template>
    <ion-page>
        <ion-content class="ion-padding-top">
            <div class="flex flex-col w-5/6 mx-auto gap-8 mt-[15vh]">
                <div class="text-center">
                    <h1 class="text-3xl font-bold mb-5">Let's setup your device</h1>
                    <p class="text-lg text-gray-400">First we'll connect with bluetooth</p>
                </div>
                
                <div class="rounded-lg shadow-lg p-4">
                    <div v-if="devices.length > 0" class="max-h-[50vh] overflow-y-auto space-y-2">
                        <div 
                            v-for="device in devices" 
                            :key="device.device.deviceId"
                            class="p-2 bg-zinc-800 rounded"
                        >
                            <div class="font-medium">{{ device.device.name || device.localName || 'Unknown Device' }}</div>
                            <div class="text-sm">{{ device.device.deviceId }}</div>
                            <div v-if="device.rssi" class="text-xs">Signal: {{ device.rssi }} dBm</div>
                        </div>
                    </div>
                    
                    <p v-else-if="!isScanning" class="text-gray-500 text-sm text-center">
                        No devices found
                    </p>
                </div>

                <button class="btn bg-blue-500 p-4 rounded-lg mx-auto" @click="scanForDevices" :disabled="isScanning">
                    {{ isScanning ? 'Scanning...' : 'Scan for Devices' }}
                </button>
            </div>
        </ion-content>
    </ion-page>
</template>

<style scoped></style>
