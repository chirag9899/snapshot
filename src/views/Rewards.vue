<script setup>
import { onMounted, onUnmounted, reactive } from 'vue';
import { commify, shorten } from '@/helpers/utils';
import { getRewards, claimReward, claimAllRewards } from '@/helpers/rewards';
import { useHead } from '@vueuse/head';

const { userTheme } = useSkin();
const { env } = useApp();

const { web3, login } = useWeb3();

const themeBefore = userTheme.value;

useHead({ title: 'Rewards' });

const state = reactive({
  rewardsLoading: true,
  rewards: [],
  totalRewards: 0,
  showRewards: false,
  claimData: { totalBalance: 0, totalClaimed: 0 }
});

loadRewards();

async function loadRewards() {
  console.log('loadRewards');
  state.rewardsLoading = true;
  const data = await getRewards();
  const { rewards, claimInfo } = data;
  console.log(rewards);
  let totalRewards = 0;
  for (let i = 0; i < rewards.length; i++) {
    totalRewards += rewards[i].claimable * rewards[i].rewardTokenPrice;
  }
  state.totalRewards = totalRewards;
  state.claimData = claimInfo;
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
});

onUnmounted(() => {
  userTheme.value = themeBefore;
});
</script>

<template>
  <div>
    <div id="content" class="flex h-full">
      <BaseContainer class="w-full">
        <div class="">
          <h2>Claim rewards</h2>
          <p>
            These rewards are claimed automatically for you so you can claim
            when you're ready without time restrictions. You can choose to claim
            them all at once or claim them separately though we advice to claim
            them all together to save on gas costs.
          </p>
        </div>
        <div
          class="space-content-between grid w-full gap-4 pb-4 pt-4 text-[20px] md:grid-cols-2 lg:grid-cols-3"
          style="width: 100%"
        >
          <div class="text-left">
            <p>Total unclaimed rewards</p>
            <p>$ {{ commify(state.claimData.totalBalance, 2) }}</p>
          </div>
          <div class="text-left">
            <p>Total claimed rewards</p>
            <p>$ {{ commify(state.claimData.totalClaimed, 2) }}</p>
          </div>
        </div>

        <div>
          <BaseBlock class="p-2" :slim="true">
            <BaseContainer
              class="flex flex-col flex-wrap items-center text-[24px] xs:flex-row md:flex-nowrap"
            >
              Yours to claim:
              <div class="pl-1 text-white">
                ${{ commify(state.totalRewards, 2) }}
              </div>
              <div
                class="mt-2 whitespace-nowrap text-right text-skin-text xs:ml-auto xs:mt-0"
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

        <BaseContainer class="mb-4 mt-4 w-full">
          <div class="">
            <p class="text-center">
              Once the vote closes, your rewards will be calculated and updated
              the next day at 1PM UTC.
            </p>
          </div>
        </BaseContainer>

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
                style="height: 300px"
              >
                <div class="relative mb-2 inline-block">
                  <BaseAvatar
                    :src="reward.rewardTokenLogo"
                    size="82"
                    class="mb-1"
                  />
                </div>

                <div class="mb-4 mt-4 grid grid-cols-2 gap-1 text-[16px]">
                  <div class="text-left">Reward</div>
                  <div class="text-right">
                    {{ shorten(commify(reward.claimable)) }}
                    {{ reward.rewardToken.symbol }}
                  </div>
                  <div class="text-left">USD value</div>
                  <div class="text-right">
                    {{
                      '$' +
                      commify(reward.claimable * reward.rewardTokenPrice, 2)
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
