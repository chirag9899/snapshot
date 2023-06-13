<script setup>
import { ref, onMounted, reactive } from 'vue';
import { shorten } from '@/helpers/utils';
import { getActiveSnapshotBribes } from '@/helpers/bribeContracts';
import { useHead } from '@vueuse/head';

const { formatCompactNumber } = useIntl();

const limit = ref(12);

const state = reactive({
  bribesLoading: false,
  bribes: []
});

getActiveBribes();
useHead({ title: 'Active bribes' });

async function getActiveBribes() {
  state.bribesLoading = true;
  state.bribes = await getActiveSnapshotBribes();

  state.bribesLoading = false;
}
</script>

<template>
  <div class="relative">
    <BaseContainer
      class="mb-4 flex flex-col flex-wrap items-center xs:flex-row md:flex-nowrap"
    >
      <div
        class="mt-2 whitespace-nowrap text-right text-skin-text xs:ml-auto xs:mt-0"
      >
        {{ formatCompactNumber(state.bribes.length) }} bribed proposals
      </div>
    </BaseContainer>

    <BaseContainer :slim="true">
      <TransitionGroup
        name="fade"
        tag="div"
        class="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
      >
        <div v-for="bribe in state.bribes.slice(0, limit)" :key="bribe">
          <router-link
            :to="{
              name: 'spaceProposal',
              params: { id: bribe.proposal, key: bribe.space.id }
            }"
          >
            <BaseBlock
              class="mb-0 flex items-center justify-center text-center transition-all hover:border-skin-text"
              style="height: 300px"
            >
              <div class="relative mb-2 inline-block">
                <AvatarToken :src="bribe.logo" size="82" class="mb-1" />
              </div>
              <h3
                class="mb-0 mt-0 !h-[32px] overflow-hidden pb-0 text-[22px]"
                v-text="shorten(bribe.space.name, 16)"
              />
              <div class="mb-[10px] text-skin-text">
                {{ bribe.title }}
              </div>

              <div class="mb-[10px] text-skin-text">
                {{ bribe.amount }} {{ bribe.symbol }} to vote
                {{ bribe.choices[bribe.option - 1] }}
              </div>
              <BaseButton class="!mb-0">View Proposal</BaseButton>
            </BaseBlock>
          </router-link>
        </div>
      </TransitionGroup>
      <ExploreSkeletonLoading v-if="state.bribesLoading" is-spaces />
    </BaseContainer>
    <div class="relative">
      <div ref="endElement" class="absolute h-[10px] w-[10px]" />
    </div>
  </div>
</template>
