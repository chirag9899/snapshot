<script setup>
import { onMounted, onUnmounted, reactive } from 'vue';
import { useI18n } from '@/composables/useI18n';
import { useSkin, DARK } from '@/composables/useSkin';
import { useApp } from '@/composables/useApp';
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
  getActivePeriod
} from '@/helpers/bribeContracts';
import { getTokenNameBalance } from '@/helpers/rewards';
import { useModal, useWeb3 } from '@/composables';
import { useRoute } from 'vue-router';

const { setPageTitle } = useI18n();
const { userTheme } = useSkin();
const { env } = useApp();
const route = useRoute();

const themeBefore = userTheme.value;

const { web3, web3Account, login, getProvider } = useWeb3();
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
  governanceTokenInfo: { name: 'governance token', symbol: '', balance: 0 }
});

loadGauges();

function getProject() {
  return Projects.find(item => item.name === route.params.name);
}

async function loadGauges(skip = 0) {
  state.gaugesLoading = true;
  state.showTable = skip > 0 ? true : false;
  let gauges = [];
  try {
    const provider = await getProvider();

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
  setPageTitle('Gauge Bribes');
});

onUnmounted(() => {
  userTheme.value = themeBefore;
});

async function openModal(gauge) {
  if (web3Account.value === '') {
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

  if (state.bribeAmount < 0) {
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
    state.bribeAmount = 0;
    state.bribeToken = '';

    loadGauges();
  } catch (e) {
    console.log(e);
  }

  state.modalOpen = false;
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
                {{ commify(state.tokenInfo.balance, 3) }}
                {{ state.tokenInfo.symbol }}
              </p>
            </div>
            <div class="text-left">
              <p>{{ state.governanceTokenInfo.name }} balance</p>
              <p>
                {{ commify(state.governanceTokenInfo.balance, 3) }}
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
                  $ {{ commify(gauge.dollarsPerVote) }}
                </td>
                <td class="table-number">
                  $ {{ commify(gauge.totalRewards) }}
                </td>
                <td>
                  <BaseButton
                    class="btn-small !bg-skin-bg"
                    :primary="true"
                    @click="openModal(gauge)"
                    >Add bribe
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
        <h4>Add bribe for {{ shorten(state.selectedGauge.name, 20) }}</h4>
        <BaseContainer class="p-6">
          <InputString
            v-model="state.bribeToken"
            class="mb-2"
            :definition="{ title: 'token address' }"
            :error="state.tokenError"
          />
          <inputNumber
            v-model="state.bribeAmount"
            class="mb-2"
            :definition="{ title: 'bribe amount' }"
            :error="state.amountError"
          />
          <BaseButton class="primary mt-2" @click="addBribe()"
            >Add Bribe
          </BaseButton>
        </BaseContainer>
      </template>
    </BaseModal>
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
