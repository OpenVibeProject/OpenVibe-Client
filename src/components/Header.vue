<script setup lang="ts">
import router from '@/router';
import logo from '/logo.svg';

</script>

<template>
    <div class="flex flex-row items-center m-4">
        <img :src="logo" alt="OpenVibe Logo" class="h-12 w-12 mr-2 cursor-pointer" @click="router.push('/')" />
        <div class="flex flex-row items-end gap-2 cursor-pointer" @click="router.push('/')">
            <h1 class="text-4xl font-bold">OpenVibe</h1>
            <h4 class="text-xl text-gray-400">BETA</h4>
        </div>
    </div>

</template>

<style scoped></style>
