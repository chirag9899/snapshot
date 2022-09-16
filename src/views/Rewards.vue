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
  totalRewards: 0,
  showRewards: false
});

loadRewards();

async function loadRewards() {
  console.log('loadRewards');
  state.rewardsLoading = true;
  const rewards = await getRewards();
  console.log(rewards);
  let totalRewards = 0;
  for (let i = 0; i < rewards.length; i++) {
    totalRewards += rewards[i].claimable * rewards[i].rewardTokenPrice;
  }
  state.totalRewards = totalRewards;
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
          <BaseBlock>
            <BaseContainer
              class="flex flex-col flex-wrap items-center text-[24px] xs:flex-row md:flex-nowrap"
            >
              Total claimable rewards:
              <div class="pl-1 text-white">
                ${{ commify(state.totalRewards) }}
              </div>
              <div
                class="mt-2 whitespace-nowrap text-right text-skin-text xs:mt-0 xs:ml-auto"
              >
                <BaseButton
                  :disabled="state.rewards.length < 2"
                  @click="claimAll()"
                  >claim all
                </BaseButton>
              </div>
            </BaseContainer>
          </BaseBlock>
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
                class="mb-0 flex justify-center text-center transition-all hover:border-skin-text"
                style="height: 350px"
              >
                <div class="relative mb-2 inline-block">
                  <BaseAvatar
                    :src="reward.rewardTokenLogo"
                    size="82"
                    class="mb-1"
                  />
                </div>

                <div class="mb-3 mt-4 grid grid-cols-2 gap-1 text-[16px]">
                  <div class="text-left">Token amount</div>
                  <div class="text-right">
                    {{ commify(reward.claimable, 3) }}
                    {{ shorten(reward.rewardToken.symbol, 5) }}
                  </div>
                  <div class="text-left">USD amount</div>
                  <div class="text-right">
                    {{
                      '$' + commify(reward.claimable * reward.rewardTokenPrice)
                    }}
                  </div>
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
