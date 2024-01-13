<script setup lang="ts">
const { pendingTransactions, pendingTransactionsWithHash } = useTxStatus();
const { env, showSidebar, domain } = useApp();
const { web3Account, web3, open, login, checkConnected } = useWeb3();
import { supportedChain } from '../helpers/supportedChains';
import Alert from '../views/Alert.vue';

const showDemoBanner = ref(true);
const showPendingTransactionsModal = ref(false);
const showAlert = ref(false);
const showSwitch = ref(false);

watch(
  () => pendingTransactionsWithHash.value.length === 0,
  () => {
    showPendingTransactionsModal.value = false;
  }
);

let updatedID;
onMounted(async () => {
  updatedID = setInterval(async () => {
    const isConnected = checkConnected();
    const isSupportedChain = supportedChain.get(web3.value.network.chainId);

    if (isConnected) {
      if (isSupportedChain?.name === undefined) {
        try {
          await login();
        } catch (error) {
          showAlert.value = false;
          console.error('Failed:', error);
        }
      }
      if (!isSupportedChain) {
        showAlert.value = true;
      } else {
        showAlert.value = false;
      }
    }

    showSwitch.value = isConnected;
  }, 2000); // Delay
});
onUnmounted(() => {
  clearInterval(updatedID);
});

import BaseNetworkItem from './BaseNetworkItem.vue';
</script>

<template>
  <Alert v-show="showAlert" message="Switch to Supported Network First!" />
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

          <!-- multichain switch  -->
          <div
            v-if="showSwitch"
            class="relative"
            tabindex="0"
            @click="open({ view: 'Networks' })"
          >
            <BaseButton
              class="flex items-center rounded-none"
              style="font-size: 18px; width: 170px; height: 40px"
            >
              <div
                v-if="
                  checkConnected() && supportedChain.get(web3.network.chainId)
                "
                class="flex items-center justify-start"
              >
                <!-- <div v-if="checkWalletStatus()" class="flex items-center justify-start"> -->
                <img
                  :src="supportedChain.get(web3.network.chainId)?.imageUrl"
                  alt=""
                  class="mr-2 h-4 w-4 object-contain"
                />
                <p>{{ supportedChain.get(web3.network.chainId)?.name }}</p>
              </div>
              <p v-else>Switch Network</p>
            </BaseButton>
          </div>

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
