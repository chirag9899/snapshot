<script setup>
import { ref, onMounted, reactive } from 'vue';
import { commify, shorten } from '@/helpers/utils';
import { getActiveSnapshotIncentives } from '@/helpers/quicksnapContracts';
import { useHead } from '@vueuse/head';
import { ethers } from 'ethers';

const { formatCompactNumber } = useIntl();

const limit = ref(12);

const state = reactive({
  incentivesLoading: false,
  rewards: []
});

getActiveIncentives();
useHead({ title: 'Active incentives' });

async function getActiveIncentives() {
  state.incentivesLoading = true;
  state.rewards = await getActiveSnapshotIncentives();

  state.incentivesLoading = false;
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
        {{ formatCompactNumber(state.rewards.length) }} incentivized proposals
      </div>
    </BaseContainer>

    <BaseContainer :slim="true">
      <TransitionGroup
        name="fade"
        tag="div"
        class="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
      >
        <div
          v-for="incentive in state.rewards.slice(0, limit)"
          :key="incentive"
        >
          <router-link
            :to="{
              name: 'spaceProposal',
              params: { id: incentive.proposal, key: incentive.space.id }
            }"
          >
            <BaseBlock
              class="mb-0 flex items-center justify-center text-center transition-all hover:border-skin-text"
              style="height: 400px"
            >
              <div class="relative mb-2 inline-block">
                <AvatarToken :src="incentive.logo" size="82" class="mb-1" />
              </div>
              <h3
                class="mb-0 mt-0 !h-[32px] overflow-hidden pb-0 text-[22px]"
                v-text="shorten(incentive.space.name, 16)"
              />
              <div class="mb-[10px] text-skin-text">
                {{ incentive.title }}
              </div>

              <div class="mb-[10px] text-skin-text">
                {{ commify(incentive.formattedAmount) }}

                {{ incentive.symbol }} to vote
                {{ incentive.choices[incentive.option - 1] }}
              </div>
              <BaseButton class="!mb-0">View Proposal</BaseButton>
            </BaseBlock>
          </router-link>
        </div>
      </TransitionGroup>
      <ExploreSkeletonLoading v-if="state.incentivesLoading" is-spaces />
    </BaseContainer>
    <div class="relative">
      <div ref="endElement" class="absolute h-[10px] w-[10px]" />
    </div>
  </div>
</template>
