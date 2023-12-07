<script setup>
import { ref, onMounted } from 'vue';
import { shorten } from '@/helpers/utils';

import Projects from '../../config/Projects.json';

const { formatCompactNumber } = useIntl();
const limit = ref(12);
</script>

<template>
  <div class="relative">
    <BaseContainer>
      <BaseBlock class="mb-4 justify-center transition-all">
        <p>
          We only support a few projects for now, in order to support your
          project you can follow the instructions in our
          <a href="https://github.com/quicksnap-io/snapshot" target="_blank"
            >readme on github</a
          >.
        </p>
      </BaseBlock>
    </BaseContainer>
    <BaseContainer
      class="mb-4 flex flex-col flex-wrap items-center xs:flex-row md:flex-nowrap"
    >
      <div
        class="mt-2 whitespace-nowrap text-right text-skin-text xs:ml-auto xs:mt-0"
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
            :to="{ name: 'veproject', params: { name: project.name } }"
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
              <BaseButton class="!mb-0">View incentives</BaseButton>
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
