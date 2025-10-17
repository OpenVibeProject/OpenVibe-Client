<script setup lang="ts">
import { ref, computed } from 'vue';
import { IonModal } from '@ionic/vue';
import { WiFiProps } from '@/types/WiFiProps';
import { WiFiEmits } from '@/types/WiFiEmits';

const props = defineProps<WiFiProps>();
const emit = defineEmits<WiFiEmits>();

const password = ref('');
const customSSID = ref('');

const handleConnect = () => {
  const ssid = props.isCustom ? customSSID.value : props.network?.SSID || '';
  emit('connect', { ssid, password: password.value });
};

const handleDismiss = () => {
  emit('dismiss');
  password.value = '';
  customSSID.value = '';
};

const isFormValid = computed(() => {
  const hasPassword = password.value.length > 0;
  const hasSSID = props.isCustom ? customSSID.value.length > 0 : true;
  return hasPassword && hasSSID;
});
</script>

<template>
  <ion-modal :is-open="isOpen" @did-dismiss="handleDismiss">
    <div class="p-6 flex flex-col items-center text-center rounded-2xl modal-content">

      <h2 class="text-lg font-semibold mb-4">{{ isCustom ? 'Custom Network' : network?.SSID }}</h2>

      <div class="w-full space-y-4">
        <input
          v-if="isCustom"
          v-model="customSSID"
          type="text"
          placeholder="Network Name (SSID)"
          class="w-full px-4 py-3 rounded-lg bg-zinc-900 text-white placeholder-zinc-500
                 border border-zinc-700 focus:ring-green-500"
        />
        
        <input
          v-model="password"
          type="password"
          :placeholder="error ? 'Enter the password' : 'WiFi Password'"
          class="w-full px-4 py-3 rounded-lg bg-zinc-900 text-white placeholder-zinc-500
                 border"
          :class="error 
            ? 'border-red-500 focus:ring-red-500' 
            : 'border-zinc-700 focus:ring-green-500'"
        />

        <p v-if="error" class="text-red-500 text-sm mt-2">{{ error }}</p>
      </div>

      <button
        @click="handleConnect"
        class="mt-6 flex items-center justify-center w-12 h-12 rounded-full shadow-md
              transition-all"
        :class="isFormValid 
          ? 'bg-green-500 hover:bg-green-600 text-white' 
          : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'"
        :disabled="!isFormValid"
      >
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
}

.modal-content {
  border: #626262 2px solid;
}
</style>
