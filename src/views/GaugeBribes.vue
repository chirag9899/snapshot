<script setup>
import { onMounted, onUnmounted, reactive, ref } from 'vue';
import BaseModal from '../components/BaseModal.vue';
import InputString from '../components/InputString.vue';
import InputNumber from '../components/InputNumber.vue';
import Projects from '../../config/Projects.json';
import ignoredGauges from '../../config/ignoredGauges.json';
import { ethers } from 'ethers';
import gaugeController from '../abi/gaugeController.json';
import { commify, shorten } from '@/helpers/utils';

import {
  getGaugeInfo,
  addRewardAmount,
  getActivePeriod,
  getAllowance,
  approveToken,
  isERC20
} from '@/helpers/quicksnapContracts';
import { getTokenNameBalance } from '@/helpers/rewards';
import { useRoute } from 'vue-router';
import { useHead } from '@vueuse/head';

const { userTheme } = useSkin();
const { env } = useApp();
const route = useRoute();

const themeBefore = userTheme.value;

// const { web3, web3Account, login, getProvider } = useWeb3();
const { userAddress, ethersProvider } = useConnectButton();

watch(ethersProvider, newAddress => {
  console.log('provider', newAddress);
});

const { modalAccountOpen } = useModal();

let epochEnd = new Date(getActivePeriod() * 1000);
epochEnd.setDate(epochEnd.getDate() + 7);

const state = reactive({
  selectedProject: getProject(),
  gaugesLoading: true,
  gauges: [],
  showTable: false,
  modalOpen: false,
  selectedGauge: false,
  bribeToken: '',
  bribeAmount: 0,
  tokenError: {},
  amountError: {},
  ignoredGauges: 0,
  search: '',
  tokenInfo: { name: 'token', symbol: '', balance: 0 },
  governanceTokenInfo: { name: 'governance token', symbol: '', balance: 0 },
  isApproved: false
});
let showBribeAddedMessage = ref(false);

loadGauges();

useHead({ title: 'Gauge incentives' });

function getProject() {
  return Projects.find(item => item.name === route.params.name);
}

async function loadGauges(skip = 0) {
  state.gaugesLoading = true;
  state.showTable = skip > 0 ? true : false;
  let gauges = [];
  try {
    const provider = ethersProvider.value;
    // const provider = await getProvider();

    const gaugeControllerContract = new ethers.Contract(
      state.selectedProject.gaugeControllerAddress,
      gaugeController.abi,
      provider
    );

    try {
      state.tokenInfo = await getTokenNameBalance(
        state.selectedProject.tokenAddress
      );
      state.governanceTokenInfo = await getTokenNameBalance(
        state.selectedProject.veAddress
      );
    } catch (e) {
      console.log(e);
    }

    const count = await gaugeControllerContract.n_gauges();
    console.log('count', count.toString());

    let numGauges = 20;

    if (skip == 0) {
      state.gauges = [];
      state.ignoredGauges = 0;
    } else {
      skip += state.ignoredGauges;
      if (count >= state.gauges.length + numGauges + state.ignoredGauges) {
        numGauges = state.gauges.length - 1 + numGauges + state.ignoredGauges;
      } else {
        numGauges = count;
      }
    }

    for (let i = skip; i < numGauges; i++) {
      const gaugeAddress = await gaugeControllerContract.gauges(i);
      console.log(gaugeAddress);
      if (!ignoredGauges.includes(gaugeAddress)) {
        const {
          gaugeName,
          gaugeWeight,
          totalRewards,
          dollarsPerVote,
          gaugeType
        } = await getGaugeInfo(
          state.selectedProject.name,
          state.selectedProject.bribeAddress,
          gaugeAddress,
          gaugeControllerContract,
          i
        );
        if (!(state.selectedProject.name === 'ANGLE' && gaugeType != 0)) {
          let newGauge = {
            id: i,
            address: gaugeAddress,
            name: gaugeName,
            gaugeWeight,
            totalRewards,
            dollarsPerVote
          };
          gauges.push(newGauge);
        } else {
          state.ignoredGauges++;
        }
      } else {
        state.ignoredGauges++;
      }
    }
  } catch (e) {
    console.log('e', e);
  } finally {
    state.gauges.push(...gauges);
    state.gaugesLoading = false;
    state.showTable = true;
  }
}

onMounted(() => {
  userTheme.value = DARK;
});

onUnmounted(() => {
  userTheme.value = themeBefore;
});

async function openModal(gauge) {
  if (userAddress.value === '') {
    modalAccountOpen.value = true;
  } else {
    state.modalOpen = true;
    state.selectedGauge = gauge;
  }
}

async function addBribe() {
  console.log(state.bribeToken, state.bribeAmount);
  state.tokenError = {};
  state.amountError = {};

  if (!ethers.utils.isAddress(state.bribeToken)) {
    state.tokenError.message = 'Please enter a valid token address';
    return;
  }

  const isToken = await isERC20(state.bribeToken);

  if (!isToken) {
    state.tokenError.message = 'Please enter a valid token address';
    return;
  }

  if (state.bribeAmount < 0 || !state.bribeAmount) {
    state.amountError.message = 'Please enter a valid token amount';
    return;
  }

  try {
    await addRewardAmount(
      state.selectedProject.bribeAddress,
      state.selectedGauge.address,
      state.bribeAmount,
      state.bribeToken
    );

    state.modalOpen = false;
    state.bribeAmount = 0;
    state.bribeToken = '';

    showBribeAddedMessage.value = true;
  } catch (e) {
    console.log(e);
    state.modalOpen = false;
  }
}

async function checkAllowance(e) {
  state.tokenError = {};
  const tokenAddress = e.target.value;
  try {
    if (!ethers.utils.isAddress(tokenAddress)) {
      state.tokenError.message = 'Please enter a valid token address';
      state.isApproved = false;
      return;
    }

    const isToken = await isERC20(tokenAddress);

    if (!isToken) {
      state.tokenError.message = 'Please enter a valid token address';
      state.isApproved = false;
      return;
    }

    const allowance = await getAllowance(
      tokenAddress,
      state.selectedProject.bribeAddress
    );

    if (allowance > 0) {
      state.isApproved = true;
    } else {
      state.isApproved = false;
    }
  } catch (e) {
    console.log(e);
    state.isApproved = false;
  }
}

async function approve() {
  if (!ethers.utils.isAddress(state.bribeToken)) {
    state.tokenError.message = 'Please enter a valid token address';
    return;
  }

  state.isApproved = await approveToken(
    state.bribeToken,
    state.selectedProject.bribeAddress
  );
}
</script>

<template>
  <div>
    <div id="content" class="flex h-full min-h-screen">
      <BaseContainer class="w-full">
        <BaseContainer>
          <BaseContainer
            class="flex flex-col flex-wrap items-center px-0 pt-2 xs:flex-row md:flex-nowrap"
          >
            <AvatarToken
              :src="state.selectedProject.logo"
              size="82"
              class="mr-2"
            />
            <div class="ml-2 text-[30px]">
              {{ state.selectedProject.displayName }}
              <BaseLink :link="state.selectedProject.voteUrl"></BaseLink>
            </div>
          </BaseContainer>

          <div
            class="space-content-between mb-6 mt-6 grid w-full grid-cols-3 text-[20px]"
            style="width: 100%"
          >
            <div class="text-left">
              <p>{{ state.tokenInfo.name }} balance</p>
              <p>
                {{ commify(state.tokenInfo.balance) }}
                {{ state.tokenInfo.symbol }}
              </p>
            </div>
            <div class="text-left">
              <p>{{ state.governanceTokenInfo.name }} balance</p>
              <p>
                {{ commify(state.governanceTokenInfo.balance) }}
                {{ state.governanceTokenInfo.symbol }}
              </p>
            </div>
            <div class="text-right">
              <p>
                Epoch ends on
                <br />
                {{
                  epochEnd.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })
                }}
              </p>
            </div>
          </div>
        </BaseContainer>

        <BaseSearch
          class="mt-4"
          :model-value="state.search"
          :modal="true"
          placeholder="Search Gauges"
        />

        <table v-if="state.showTable" class="mt-4 w-full table-auto">
          <thead>
            <tr>
              <th>Gauge name</th>
              <th>Total votes</th>
              <th>$/QI</th>
              <th>Total rewards</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="gauge in state.gauges" :key="gauge.title">
              <tr>
                <td>{{ shorten(gauge.name, 70) }}</td>
                <td class="table-number">{{ commify(gauge.gaugeWeight) }}</td>
                <td class="table-number">
                  $ {{ commify(gauge.dollarsPerVote, 2) }}
                </td>
                <td class="table-number">
                  $ {{ commify(gauge.totalRewards, 2) }}
                </td>
                <td>
                  <BaseButton
                    class="btn-small !bg-skin-bg"
                    :primary="true"
                    @click="openModal(gauge)"
                    >Add incentive
                  </BaseButton>
                </td>
              </tr>
            </template>
          </tbody>
        </table>

        <LoadingRow v-if="state.gaugesLoading" class="mt-4" :block="true" />
        <BaseButton
          class="mt-4 w-full"
          :disabled="state.gaugesLoading"
          @click="loadGauges(state.gauges.length)"
          >Show more
        </BaseButton>
      </BaseContainer>
    </div>

    <BaseModal :open="state.modalOpen" @close="state.modalOpen = false">
      <template #header>
        <h4>Add incentives for {{ shorten(state.selectedGauge.name, 20) }}</h4>
        <BaseContainer class="p-6">
          <InputString
            v-model="state.bribeToken"
            class="mb-2"
            :definition="{ title: 'token address' }"
            :error="state.tokenError"
            @input="checkAllowance($event)"
          />
          <inputNumber
            v-model="state.bribeAmount"
            class="mb-2"
            :definition="{ title: 'incentive amount' }"
            :error="state.amountError"
          />
          <BaseButton
            :disabled="
              state.isApproved ||
              state.tokenError.message ||
              state.amountError.message
            "
            class="primary mr-4 mt-4"
            @click="approve()"
            >Approve
          </BaseButton>
          <BaseButton
            :disabled="
              !state.isApproved ||
              state.tokenError.message ||
              state.amountError.message
            "
            class="primary ml-4 mt-4"
            @click="addBribe()"
            >Add Incentive
          </BaseButton>
        </BaseContainer>
      </template>
    </BaseModal>
    <ModalNotice
      :open="showBribeAddedMessage"
      title="Done!"
      @close="showBribeAddedMessage = false"
    >
      <p>
        Your incentive will be added in a few minutes when confirmed by the
        blockchain
      </p>
    </ModalNotice>
  </div>
</template>

<style scoped lang="scss">
.btn-small {
  border-radius: 15px;
  height: 30px;
  font-size: 16px;
  padding-left: 10px;
  padding-right: 10px;
}

.table-number {
  text-align: right;
  padding-left: 10px;
  padding-right: 10px;
}
</style>
