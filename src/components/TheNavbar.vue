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
            quicksnap
          </router-link>
          <router-link
            :to="{ path: '/' }"
            class="menuItem -ml-3 hidden items-center sm:block"
            style="font-size: 18px"
          >
            Snapshot Voters
          </router-link>
          <router-link
            :to="{ path: '/vevoters' }"
            class="menuItem -ml-3 hidden items-center sm:block"
            style="font-size: 18px"
          >
            VE Voters
          </router-link>
          <router-link
            :to="{ path: '/rewards' }"
            class="menuItem -ml-3 hidden items-center sm:block"
            style="font-size: 18px"
          >
            Rewards
          </router-link>
        </div>
        <div :key="web3Account" class="flex space-x-2">
          <NavbarAccount />

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
}
</style>
