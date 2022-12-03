<script setup>
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';

import { useIntl, useI18n } from '@/composables';

const { t, setPageTitle } = useI18n();
const { formatCompactNumber } = useIntl();
const route = useRoute();

onMounted(() => {
  setPageTitle('ve projects');
});
</script>

<template>
  <div>
    <ExploreProjects />
  </div>
  <div class="relative">
    <div ref="endElement" class="absolute h-[10px] w-[10px]" />
  </div>
</template>
