<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { IonModal } from '@ionic/vue';

interface Props
{
  isOpen: boolean;
}

interface Emits
{
  (e: 'dismiss'): void;
  (e: 'connect', serverUrl: string, deviceId: string): void;
}

const emit = defineEmits<Emits>();
const router = useRouter();

const handleDismiss = () =>
{
  emit('dismiss');
  deviceId.value = '';
};

const handleConnect = () =>
{
  if (deviceId.value?.trim())
  {
    emit('connect', '', deviceId.value);
    deviceId.value = '';
    router.push('/');
  }
};

defineProps<Props>();
const deviceId = ref('');

const isFormValid = computed(() =>
{
  return deviceId.value.length > 0;
});

</script>

<template>
  <ion-modal :is-open="isOpen" @did-dismiss="handleDismiss">
    <div class="p-6 flex flex-col items-center text-center rounded-2xl modal-content">
      <h2 class="text-lg font-semibold mb-4">Remote Pairing</h2>

      <div class="w-full space-y-4">
        <input v-model="deviceId" type="text" placeholder="Device ID" class="w-full px-4 py-3 rounded-lg bg-zinc-900 text-white placeholder-zinc-500
                 border border-zinc-700 focus:ring-green-500" />
      </div>

      <button @click="handleConnect"
        class="mt-6 flex items-center justify-center w-12 h-12 rounded-full shadow-md transition-all" :class="isFormValid
          ? 'bg-green-500 hover:bg-green-600 text-white'
          : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'" :disabled="!isFormValid">
        <span class="text-xl">➔</span>
      </button>
    </div>
  </ion-modal>
</template>

<style scoped>
ion-modal {
  --width: 340px;
  --height: auto;
  --background: #1a1a1a;
  --backdrop-opacity: 0.8;
  --border-radius: 16px;
}

.modal-content {
  border: #626262 2px solid;
}
</style>