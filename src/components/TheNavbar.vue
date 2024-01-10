<script setup lang="ts">
import {
  createWeb3Modal,
  defaultConfig,
  useWeb3Modal
} from '@web3modal/ethers5/vue';

const { pendingTransactions, pendingTransactionsWithHash } = useTxStatus();
const { env, showSidebar, domain } = useApp();
const { web3Account, web3 } = useWeb3();

const showDemoBanner = ref(true);
const showPendingTransactionsModal = ref(false);
const pendingCount = ref(pendingTransactions.value.length);

const projectId = '55f8e4a3ce3a3ad37353e8582b8db050';

const mainnet = {
  chainId: 1,
  name: 'Ethereum',
  currency: 'ETH',
  explorerUrl: 'https://etherscan.io',
  rpcUrl: import.meta.env.VITE_WEB3_ENDPOINT
};

// 3. Create modal
const metadata = {
  name: 'QuickSnap Finance',
  description:
    'QuickSnap is a decentralized platform rewarding DAO governance token holders for actively participating in token protocol governance. It functions as a marketplace for governance incentives, streamlining the process for both initiators and users. This setup promotes voter engagement and offers users the chance to earn extra yields from their governance tokens through active involvement in governance activities.',
  url: 'https://quicksnap.finance/',
  icons: []
};

createWeb3Modal({
  ethersConfig: defaultConfig({ metadata, defaultChainId: 1 }),
  chains: [mainnet],
  projectId,
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#211f24'
  }
});

const { open } = useWeb3Modal();

watch(
  () => pendingTransactionsWithHash.value.length === 0,
  () => {
    showPendingTransactionsModal.value = false;
  }
);

watch(
  [web3],
  async () => {
    console.log('network changed', web3.value.network);
    if (!web3.value.network || web3.value.network.chainId != 1) {
      await open({ view: 'Networks' });
    }
  },
  { deep: true }
);
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
