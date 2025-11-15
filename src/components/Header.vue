<script setup lang="ts">
import router from '@/router';

</script>

<template>
    <div class="flex flex-row items-end gap-2 m-4 mt-12 cursor-pointer" @click="router.push('/')">
        <h1 class="text-4xl font-bold">OpenVibe</h1>
        <h4 class="text-xl text-gray-400">BETA</h4>
    </div>
</template>

<style scoped>

</style>
