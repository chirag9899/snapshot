<script setup lang="ts">
const { pendingTransactions, pendingTransactionsWithHash } = useTxStatus();
const { env, showSidebar, domain } = useApp();
const { web3Account } = useWeb3();

const showDemoBanner = ref(true);
const showPendingTransactionsModal = ref(false);

watch(
  () => pendingTransactionsWithHash.value.length === 0,
  () => {
    showPendingTransactionsModal.value = false;
  }
);

const showChainDropdown = ref(false);
const selectedChain = ref('');

const toggleChainDropdown = () => {
  showChainDropdown.value = !showChainDropdown.value;
};

const selectChain = (chain: string) => {
  // Handle chain selection logic here
  console.log(`Selected chain: ${chain}`);
  selectedChain.value = chain; // Store the selected chain
  showChainDropdown.value = false; // Close the dropdown after selection
  console.log(selectedChain.value);
};

import BaseNetworkItem from './BaseNetworkItem.vue';
</script>

<template>
  <div
    v-if="env === 'demo' && showDemoBanner"
    class="relative bg-primary p-3 text-center"
    style="color: white; font-size: 20px"
  >
    {{ $t('demoSite') }}
    <BaseButtonIcon
      class="absolute right-3 top-[10px]"
      @click="showDemoBanner = false"
    >
      <i-ho-x />
    </BaseButtonIcon>
  </div>
  <div>
    <BaseContainer class="pl-0 pr-3 sm:!px-4">
      <div class="flex items-center py-[12px]">
        <div class="ml-3 flex flex-auto items-center">
          <BaseButtonRound
            class="sm:hidden"
            @click="showSidebar = !showSidebar"
          >
            <i-ho-dots-vertical class="text-skin-link" />
          </BaseButtonRound>
          <router-link
            :to="{ path: '/' }"
            class="menuItem -ml-3 hidden items-center sm:block"
            style="font-size: 28px"
          >
            <i-s-logo class="text-[24px]" />
            quicksnap
          </router-link>
          <!--          <router-link-->
          <!--            :to="{ path: '/' }"-->
          <!--            class="menuItem -ml-3 hidden items-center sm:block"-->
          <!--            style="font-size: 18px"-->
          <!--          >-->
          <!--            Snapshot Voters-->
          <!--          </router-link>-->
          <!--          <router-link-->
          <!--            :to="{ path: '/vevoters' }"-->
          <!--            class="menuItem -ml-3 hidden items-center sm:block"-->
          <!--            style="font-size: 18px"-->
          <!--          >-->
          <!--            VE Voters-->
          <!--          </router-link>-->
        </div>
        <div :key="web3Account" class="flex items-center space-x-2">
          <router-link
            :to="{ path: '/rewards' }"
            class="-ml-3 mr-3 hidden items-center sm:block"
            style="font-size: 18px"
          >
            rewards
          </router-link>
          <w3m-button balance="hide" />

          <!-- multichain support  -->

          <div class="relative" @click="toggleChainDropdown">
            <BaseButton
              class="flex items-center rounded-none"
              style="font-size: 18px; width: 150px"
            >
              <p class="w-full">
                {{ selectedChain ? selectedChain : 'Chains' }}
              </p>
              <i-ho-chevron-down class="ml-1" />
            </BaseButton>
            <div
              v-show="showChainDropdown"
              class="top-10 shadow-md absolute right-0 rounded bg-white p-2"
            >
              <!-- Add your chain options here -->
              <div @click="selectChain('Ethereum')">Ethereum</div>
              <div @click="selectChain('Binance')">Binance</div>
              <!-- Add more chains as needed -->
            </div>
          </div>

          <BaseNetworkItem
            :network="{
              logo: 'your-logo-url',
              name: 'Ethereum',
              key: 'your-network-key'
            }"
          />

          <!--          <NavbarAccount />-->
          <!--          <NavbarNotifications v-if="web3Account && !domain" />-->

          <!--          <NavbarExtras />-->
        </div>
      </div>
    </BaseContainer>
  </div>
  <div
    v-if="pendingCount > 0"
    class="flex justify-center bg-primary py-2 text-center text-white"
  >
    <LoadingSpinner fill-white class="mr-2" />
    {{ $tc('delegate.pendingTransaction', pendingCount) }}
  </div>
</template>

<style scoped lang="scss">
.menuItem {
  margin-right: 50px;
  display: flex;
  align-items: center;
}

.menuItem svg g path {
  fill: #ffbd00 !important;
}
</style>
