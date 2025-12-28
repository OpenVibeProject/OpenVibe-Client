<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useBleStore } from "@/stores/ble";
import { IonPage, IonContent } from "@ionic/vue";
import MaterialSymbolsBluetooth from "~icons/material-symbols/bluetooth";
import { BLEEmitterEnum } from "@/types/BLEEmitterEnum";
import { useDebugStore } from "@/stores/debug";
import { LogLevel } from "@/types/LogLevel";

const bleStore = useBleStore();
const debugStore = useDebugStore();
const router = useRouter();

const isBluetoothAvailable = ref(false);

watch(
  () => bleStore.isBluetoothAvailable,
  async (newValue: Promise<boolean>) => {
    isBluetoothAvailable.value = await newValue;
  },
  { immediate: true }
);

const onConnected = () => {
  router.push("/wifi-setup");
};

onMounted(async () => {
  await bleStore.scan();
  bleStore.emitter.on(BLEEmitterEnum.CONNECTED, onConnected);
});

onUnmounted(() => {
  bleStore.emitter.off?.(BLEEmitterEnum.CONNECTED, onConnected);
});
</script>

<template>
  <ion-page>
    <ion-content class="ion-padding-top">
      <div class="flex flex-col w-5/6 mx-auto gap-8 mt-[15vh]">
        <div class="text-center">
          <h1 class="text-3xl font-bold mb-5">Let's get started</h1>
          <p class="text-lg text-gray-400">
            First we’ll connect to your device using bluetooth
          </p>
        </div>
        <div
          class="search-container flex flex-col gap-15 justify-center items-center"
        >
          <div
            class="bluetooth-search mx-auto mt-[10vh] rounded-full p-5"
            :class="isBluetoothAvailable ? '' : 'disabled'"
          >
            <MaterialSymbolsBluetooth
              class="text-[10rem]"
              :class="isBluetoothAvailable ? 'text-blue-500' : 'text-gray-500'"
            />
          </div>

          <p v-if="!isBluetoothAvailable" class="text-xl">
            Please turn on the bluetooth
          </p>
          <p v-else class="text-xl">We're looking for your device</p>
        </div>
        <p class="mt-6 mx-auto underline cursor-pointer text-lg">
          <RouterLink to="remote-setup">Device far away?</RouterLink>
        </p>
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
