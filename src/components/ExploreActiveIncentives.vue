<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { commify, shorten } from '@/helpers/utils';
import { getActiveSnapshotIncentives } from '@/helpers/quicksnapContracts';
import { useHead } from '@vueuse/head';
import { ethers } from 'ethers';
import type { Header } from 'vue3-easy-data-table';

const { formatCompactNumber } = useIntl();

const headers: Header[] = [
  { text: 'DAO', value: 'logo', sortable: true },
  {
    text: 'INCENTIVES PROPOSALS',
    value: 'title',
    sortable: true
  },
  {
    text: 'TOTAL REWARDS',
    value: 'formattedAmount',
    sortable: true,
    width: 100
  },
  { text: 'VOTE', value: 'option', sortable: true }
];

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
      <DataTableSkeltonLoading v-if="state.incentivesLoading" is-spaces />
      <BaseNoResults
        v-if="state.rewards.length < 1 && !state.incentivesLoading"
        use-block
      />

      <EasyDataTable
        v-if="state.rewards.length > 0"
        :headers="headers"
        :items="state.rewards"
        :pagination="false"
        :hide-footer="true"
        :rows-per-page="state.rewards.length"
      >
        <template #item-logo="item">
          <router-link
            :to="{
              name: 'spaceProposal',
              params: { id: item.proposal, key: item.space.id }
            }"
            ><div class="flex items-center">
              <AvatarSpace
                :space="item.space"
                symbol-index="space"
                size="40"
                class="mr-1"
              />
              <div class="flex items-center justify-center gap-1 truncate">
                <span>{{ shorten(item.space.name, 16) }}</span>
              </div>
            </div>
          </router-link>
        </template>
        <template #item-title="item">
          <router-link
            :to="{
              name: 'spaceProposal',
              params: { id: item.proposal, key: item.space.id }
            }"
          >
            <div class="items-center text-skin-text">
              {{ item.title }}
            </div>
          </router-link>
        </template>

        <template #item-formattedAmount="item">
          <router-link
            :to="{
              name: 'spaceProposal',
              params: { id: item.proposal, key: item.space.id }
            }"
          >
            <div class="rewards w-[220px] items-center text-skin-text">
              {{ commify(item.formattedAmount) }} {{ item.symbol }}
            </div>
          </router-link>
        </template>

        <template #item-option="item">
          <router-link
            :to="{
              name: 'spaceProposal',
              params: { id: item.proposal, key: item.space.id }
            }"
          >
            <div class="items-center text-skin-text">
              {{ item.choices[item.option - 1] }}
            </div>
          </router-link>
        </template>
      </EasyDataTable>
    </BaseContainer>
    <div class="relative">
      <div ref="endElement" class="absolute h-[10px] w-[10px]" />
    </div>
  </div>
</template>
