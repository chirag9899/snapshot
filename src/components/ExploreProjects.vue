<script setup>
import { ref, onMounted } from 'vue';
import { shorten } from '@/helpers/utils';

import { useIntl, useI18n } from '@/composables';

import Projects from '../../config/Projects.json';

const { formatCompactNumber } = useIntl();
const { setPageTitle } = useI18n();

const limit = ref(12);

onMounted(() => {
  setPageTitle('page.title.home');
});
</script>

<template>
  <div class="relative">
    <BaseContainer
      class="mb-4 flex flex-col flex-wrap items-center xs:flex-row md:flex-nowrap"
    >
      <!--      <BaseButton-->
      <!--        class="w-full pl-3 pr-0 focus-within:!border-skin-link md:max-w-[420px]"-->
      <!--      >-->
      <!--        <TheSearchBar />-->
      <!--      </BaseButton>-->

      <div
        class="mt-2 whitespace-nowrap text-right text-skin-text xs:mt-0 xs:ml-auto"
      >
        {{ formatCompactNumber(Projects.length) }} projects
      </div>
    </BaseContainer>

    <BaseContainer :slim="true">
      <TransitionGroup
        name="fade"
        tag="div"
        class="grid gap-4 md:grid-cols-3 lg:grid-cols-4"
      >
        <div v-for="project in Projects.slice(0, limit)" :key="project.id">
          <router-link
            :to="{ name: 'project', params: { name: project.name } }"
          >
            <BaseBlock
              class="mb-0 flex items-center justify-center text-center transition-all hover:border-skin-text"
              style="height: 266px"
            >
              <div class="relative mb-2 inline-block">
                <AvatarToken :src="project.logo" size="82" class="mb-1" />
              </div>
              <h3
                class="mb-0 mt-0 !h-[32px] overflow-hidden pb-0 text-[22px]"
                v-text="shorten(project.name, 16)"
              />
              <div class="mb-[12px] text-skin-text">
                {{ project.displayName }}
              </div>
              <BaseButton class="!mb-0">View bribes</BaseButton>
            </BaseBlock>
          </router-link>
        </div>
      </TransitionGroup>
    </BaseContainer>
    <div class="relative">
      <div ref="endElement" class="absolute h-[10px] w-[10px]" />
    </div>
  </div>
</template>
