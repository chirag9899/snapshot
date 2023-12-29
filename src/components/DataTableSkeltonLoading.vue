<script setup lang="ts">
defineProps<{
  isSpaces?: boolean;
}>();

const CARD_COUNT = 12;
</script>

<template>
  <div v-if="isSpaces">
    <div
      v-for="i in CARD_COUNT"
      :key="i"
      class="mb-3 min-h-[80px] animate-pulse bg-skin-border md:rounded-xl"
    />
  </div>
</template>
