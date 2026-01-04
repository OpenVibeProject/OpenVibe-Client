<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useServerStore } from "@/stores/server";
import { useVibratorStore } from "@/stores/vibrator";
import { IonPage, IonContent } from "@ionic/vue";
import LucideServer from "~icons/lucide/server";
import LucideTrash2 from "~icons/lucide/trash-2";
import ServerModal from "@/components/ServerModal.vue";
import RemotePairingModal from "@/components/RemotePairingModal.vue";
import { TransportTypeEnum } from "@/types/TransportTypeEnum";

const serverStore = useServerStore();
const vibratorStore = useVibratorStore();
const showServerModal = ref(false);
const showRemotePairingModal = ref(false);
const selectedServer = ref<{ name: string; url: string } | null>(null);

const showCustomModal = () => {
  showServerModal.value = true;
};

const handleModalDismiss = () => {
  showServerModal.value = false;
};

const handleRemotePairingDismiss = () => {
  showRemotePairingModal.value = false;
};

const handleServerClick = (server: { name: string; url: string }) => {
  selectedServer.value = server;
  showRemotePairingModal.value = true;
};

const handleRemoteConnect = async (deviceId: string) => {
  if (selectedServer.value) {
    vibratorStore.switchTransport(
      TransportTypeEnum.REMOTE,
      selectedServer.value.url,
      deviceId
    );
    showRemotePairingModal.value = false;
  }
};

const addServer = (data: { name: string; url: string }) => {
  serverStore.addServer(data);
  showServerModal.value = false;
};

onMounted(() => {
  serverStore.loadServers();
});
</script>

<template>
  <ion-page>
    <ion-content class="ion-padding-top">
      <div class="flex flex-col w-5/6 mx-auto gap-8 mt-[15vh]">
        <div class="text-center">
          <h1 class="text-3xl font-bold mb-5">Alright, No problem</h1>
          <p class="text-lg text-gray-400">Let's connect to a remote server</p>
        </div>
        <div class="h-[55vh] overflow-y-auto">
          <div
            v-for="(server, index) in serverStore.servers"
            :key="server.url"
            class="server-container flex flex-col p-3 bg-zinc-800 cursor-pointer"
            @click="handleServerClick(server)"
          >
            <div class="server-item flex justify-between items-center p-2">
              <div class="w-full flex justify-between items-center">
                <div class="flex gap-4">
                  <div class="flex flex-row gap-3 items-center">
                    <LucideServer class="text-blue-500 text-2xl" />
                  </div>
                  <div>
                    <div>
                      <h3 class="font-semibold text-xl">{{ server.name }}</h3>
                      <p class="text-sm text-gray">{{ server.url }}</p>
                    </div>
                  </div>
                </div>
                <button
                  @click.stop="serverStore.deleteServer(index)"
                  class="text-red-500 hover:text-red-400 p-2"
                >
                  <LucideTrash2 class="text-xl" />
                </button>
              </div>
            </div>
          </div>
        </div>
        <p
          @click="showCustomModal"
          class="text-center underline cursor-pointer mt-4 text-lg"
        >
          I am self hosting
        </p>

        <ServerModal
          :is-open="showServerModal"
          @dismiss="handleModalDismiss"
          @add="addServer"
        />

        <RemotePairingModal
          :is-open="showRemotePairingModal"
          @dismiss="handleRemotePairingDismiss"
          @connect="handleRemoteConnect"
        />
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.server-container {
  border: #626262 1px solid;
  border-bottom: none;
}

.server-container:first-child {
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
}

.server-container:last-child {
  border-bottom-left-radius: 20px;
  border-bottom-right-radius: 20px;
  border: #626262 1px solid;
}
</style>
