<script setup>
import { onMounted, onUnmounted, reactive } from 'vue';
import { useI18n } from '@/composables/useI18n';
import { useSkin, DARK } from '@/composables/useSkin';
import { useApp } from '@/composables/useApp';
import ProjectsListbox from '../components/ProjectsListbox.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import BaseModal from '../components/BaseModal.vue';
import InputString from '../components/InputString.vue';
import InputNumber from '../components/InputNumber.vue';
import Projects from '../../config/Projects.json';
import ignoredGauges from '../../config/ignoredGauges.json';
import { ethers } from 'ethers';
import gaugeController from '../abi/gaugeController.json';
import { commify, shorten } from '@/helpers/utils';

import { getGaugeInfo, addRewardAmount } from '@/helpers/bribeContracts';

const { setPageTitle } = useI18n();
const { userTheme } = useSkin();
const { env } = useApp();

const themeBefore = userTheme.value;

const state = reactive({
  selectedProject: Projects[0],
  gaugesLoading: true,
  gauges: [],
  showTable: false,
  modalOpen: false,
  selectedGauge: false,
  bribeToken: '',
  bribeAmount: 0,
  tokenError: {},
  amountError: {},
  ignoredGauges: 0
});

loadGauges();

async function loadGauges(skip = 0) {
  //ToDo: support some special cases for frax and angle or just add them to the json
  //ToDo: show claimable rewards for all Projects
  state.gaugesLoading = true;
  state.showTable = skip > 0 ? true : false;
  let gauges = [];
  try {
    const { ethereum } = window;
    if (ethereum) {
      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();
      const gaugeControllerContract = new ethers.Contract(
        state.selectedProject.gaugeControllerAddress,
        gaugeController.abi,
        signer
      );
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

function openModal(gauge) {
  state.modalOpen = true;
  state.selectedGauge = gauge;
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
        <div class="mt-4 text-[20px]">
          {{ state.selectedProject.displayName }}
          <BaseLink :link="state.selectedProject.voteUrl"> </BaseLink>
        </div>

        <ProjectsListbox
          v-model="state.selectedProject"
          :items="Projects"
          class="mt-4"
          @update:modelValue="loadGauges(0)"
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

        <LoadingRow v-if="state.gaugesLoading" :block="true" />
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
        <h4>Add bribe for {{ state.selectedGauge.name }}</h4>
        <BaseContainer>
          <InputString
            v-model="state.bribeToken"
            :definition="{ title: 'token address' }"
            :error="state.tokenError"
          />
          <inputNumber
            v-model="state.bribeAmount"
            :definition="{ title: 'bribe amount' }"
            :error="state.amountError"
          />
          <BaseButton class="primary" @click="addBribe()"
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
