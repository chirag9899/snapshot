<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from '@/composables';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const routeQuery = computed(() => route.query.q || '');
</script>

<template>
  <div class="flex">
    <BaseSearch
      :model-value="routeQuery"
      :placeholder="$t('searchPlaceholder')"
      class="flex-auto pr-2"
    />
  </div>
</template>
