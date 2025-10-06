<script setup lang="ts">
import { ref } from 'vue';
import { useDebugStore } from '@/stores/debug';

const debugStore = useDebugStore();
const clickCount = ref(0);

const handleVersionClick = () => {
  clickCount.value++;
  if (clickCount.value >= 5) {
    debugStore.showConsole();
    clickCount.value = 0;
  }
};
</script>

<template>
    <div class="w-full">
        <h4 class="footer text-xl text-center text-gray-400 cursor-pointer" @click="handleVersionClick">v0.1</h4>
    </div>
</template>

<style scoped>

.footer {
  user-select: none;
}

</style>
