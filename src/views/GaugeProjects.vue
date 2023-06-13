<script setup>
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useHead } from '@vueuse/head';

const route = useRoute();

useHead({ title: 'VE projects' });
</script>

<template>
  <div>
    <ExploreProjects />
  </div>
  <div class="relative">
    <div ref="endElement" class="absolute h-[10px] w-[10px]" />
  </div>
</template>
