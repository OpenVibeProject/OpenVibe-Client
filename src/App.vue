<script setup lang="ts">
import { IonApp, IonRouterOutlet, IonHeader, IonToolbar, IonFooter } from '@ionic/vue';
import Header from './components/Header.vue';
import Footer from './components/Footer.vue';
import DebugConsole from './components/DebugConsole.vue';
import router from './router';
import { useAppStore } from './stores/app';
import { useBleStore } from './stores/ble';
import { onMounted } from 'vue';

const appStore = useAppStore();
const bleStore = useBleStore();

onMounted(async () => {
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