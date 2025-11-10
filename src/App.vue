<script setup lang="ts">
import { IonApp, IonRouterOutlet, IonHeader, IonToolbar, IonFooter } from '@ionic/vue';
import Header from './components/Header.vue';
import Footer from './components/Footer.vue';
import DebugConsole from './components/DebugConsole.vue';
import router from './router';
import { useAppStore } from './stores/app';
import { useBleStore } from './stores/ble';
import { onMounted } from 'vue';
import { useDebugStore } from './stores/debug';
import { LogLevel } from './types/LogLevel';
import { RequestEnum } from './types/RequestEnum';

const appStore = useAppStore();
const bleStore = useBleStore();
const debugStore = useDebugStore();

onMounted(async () => {

  try {
  const ws = new WebSocket('ws://192.168.0.244:6969')

    ws.onopen = () => {
      debugStore.addLog(LogLevel.INFO, 'WebSocket connection opened');
      ws.send(JSON.stringify({ request: RequestEnum.STATUS }));
    };

    ws.onmessage = (event) => {
      debugStore.addLog(LogLevel.INFO, `WebSocket message received: ${event.data}`);
    }

    ws.onclose = () => {
      debugStore.addLog(LogLevel.INFO, 'WebSocket connection closed');
    }

  } catch (error) {
    debugStore.addLog(LogLevel.ERROR, JSON.stringify(error));
  }

  if (appStore.isFirstSetup) {
    router.push("/bluetooth-setup");
  } else if (appStore.lastConnectedDeviceId) {
    await bleStore.connectToDevice(appStore.lastConnectedDeviceId);
  }

});
</script>

<template>
  <ion-app>
    <DebugConsole />
    <ion-header>
      <ion-toolbar>
        <Header/>
      </ion-toolbar>
    </ion-header>
    <ion-router-outlet />
    <ion-footer>
      <ion-toolbar>
        <Footer/>
      </ion-toolbar>
    </ion-footer>
  </ion-app>
</template>

<style scoped>

</style>