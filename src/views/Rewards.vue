<script setup>
import { onMounted, onUnmounted, reactive } from 'vue';
import { useI18n } from '@/composables/useI18n';
import { useSkin, DARK } from '@/composables/useSkin';
import { useApp } from '@/composables/useApp';
import { commify, shorten } from '@/helpers/utils';
import { getRewards, claimReward, claimAllRewards } from '@/helpers/rewards';
import { ethers } from 'ethers';
import { useWeb3 } from '@/composables';

const { setPageTitle } = useI18n();
const { userTheme } = useSkin();
const { env } = useApp();

const { web3, login } = useWeb3();

const themeBefore = userTheme.value;

const state = reactive({
  rewardsLoading: true,
  rewards: [],
  showRewards: false
});

loadRewards();

async function loadRewards() {
  console.log('loadRewards');
  state.rewardsLoading = true;
  const rewards = await getRewards();
  console.log(rewards);
  state.rewards = rewards;
  state.rewardsLoading = false;
}

async function claim(reward) {
  await claimReward(reward);
  loadRewards();
}

async function claimAll() {
  await claimAllRewards(state.rewards);
  loadRewards();
}

onMounted(() => {
  userTheme.value = DARK;
  setPageTitle('Bribe rewards');
});

onUnmounted(() => {
  userTheme.value = themeBefore;
});
</script>

<template>
  <div>
    <div id="content" class="flex h-full min-h-screen pt-[40px]">
      <BaseContainer class="w-full">
        <div>
          <h2>
            Rewards
            <BaseButton v-if="state.rewards.length > 1" @click="claimAll()"
              >claim all
            </BaseButton>
          </h2>
        </div>

        <BaseContainer class="mt-4" :slim="true">
          <TransitionGroup
            name="fade"
            tag="div"
            class="grid gap-4 md:grid-cols-3 lg:grid-cols-4"
          >
            <div
              v-for="reward in state.rewards"
              :key="reward.rewardToken.address"
            >
              <BaseBlock
                class="mb-0 flex items-center justify-center text-center transition-all hover:border-skin-text"
                style="height: 266px"
              >
                <div class="relative mb-2 inline-block">
                  <BaseAvatar
                    :src="reward.rewardTokenLogo"
                    size="82"
                    class="mb-1"
                  />
                </div>
                <h2
                  class="mb-0 mt-0 !h-[32px] overflow-hidden pb-0 text-[22px]"
                  v-text="shorten(reward.rewardToken.symbol, 16)"
                />
                <div class="mb-[12px] text-skin-text">
                  {{ ethers.utils.commify(reward.claimable) }}
                </div>
                <div class="mb-[12px] text-[12px] text-skin-text">
                  {{
                    '$' + commify(reward.claimable * reward.rewardTokenPrice)
                  }}
                </div>
                <BaseButton class="!mb-0" @click="claimReward(reward)"
                  >claim
                </BaseButton>
              </BaseBlock>
            </div>
          </TransitionGroup>
          <ExploreSkeletonLoading v-if="state.rewardsLoading" is-spaces />
          <BaseNoResults
            v-else-if="!web3.account"
            custom-text="Please connect your wallet"
            use-block
          />
          <BaseNoResults
            v-else-if="state.rewards.length < 1"
            custom-text="No Rewards found"
            use-block
          />
        </BaseContainer>
      </BaseContainer>
    </div>
  </div>
</template>

<style scoped lang="scss"></style>
