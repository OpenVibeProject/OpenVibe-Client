<script setup lang="ts">
import { ref, onMounted, onUnmounted, Ref } from 'vue';
import { useRouter } from 'vue-router';
import { useBleStore } from '@/stores/ble';
import { useDebugStore } from '@/stores/debug';
import { IonPage, IonContent } from '@ionic/vue';
import { LogLevel } from '@/types/LogLevel';
import LucideServer from '~icons/lucide/server';
import LucideTrash2 from '~icons/lucide/trash-2';

const deleteServer = () =>
{
    console.log('Delete server');
};
</script>

<template>
    <ion-page>
        <ion-content class="ion-padding-top">
            <div class="flex flex-col w-5/6 mx-auto gap-8 mt-[15vh]">
                <div class="text-center">
                    <h1 class="text-3xl font-bold mb-5">Alright, No problem</h1>
                    <p class="text-lg text-gray-400">Let's connect to a remote server</p>
                </div>
                <div class="server-container max-h-[55vh] overflow-y-auto flex flex-col p-3 bg-zinc-800 cursor-pointer">
                    <div class="server-item flex justify-between items-center p-2">
                        <div class="w-full flex justify-between items-center">
                            <div class="flex gap-4">
                                <div class="flex flex-row gap-3 items-center">
                                    <LucideServer class="text-blue-500 text-2xl" />
                                </div>
                                <div>
                                    <div>
                                        <h3 class="font-semibold text-xl">Server Name</h3>
                                        <p class="text-sm text-gray">test.example.org:8080</p>
                                    </div>
                                </div>
                            </div>
                            <button @click.stop="deleteServer" class="text-red-500 hover:text-red-400 p-2">
                                <LucideTrash2 class="text-xl" />
                            </button>
                        </div>
                    </div>
                </div>
                <p class="text-center underline">I am self hosting</p>
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
