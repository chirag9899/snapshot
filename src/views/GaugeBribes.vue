<script setup>
import { onMounted, onUnmounted, ref, computed, reactive } from 'vue';
import { useI18n } from '@/composables/useI18n';
import { useSkin, DARK } from '@/composables/useSkin';
import { useApp } from '@/composables/useApp';
import ProjectsListbox from '../components/ProjectsListbox.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import BaseModal from '../components/BaseModal.vue';
import InputString from '../components/InputString.vue';
import InputNumber from '../components/InputNumber.vue';
import Projects from '../../config/Projects.json';
import GaugeNames from '../../config/GaugeNames.json';
import ignoredGauges from '../../config/ignoredGauges.json';
import { ethers } from 'ethers';
import { BigNumber } from '@ethersproject/bignumber';
import gaugeController from '../abi/gaugeController.json';
import gauge from '../abi/gauge.json';
import angleGauge from '../abi/angleGauge.json';
import fraxGauge from '../abi/fraxGauge.json';
import bribeV3 from '../abi/bribev3.json';
import erc20 from '../abi/erc20.json';
import { commify } from '@/helpers/utils';

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
  //ToDo: improve app stucture
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

      let numGauges = 5;

      if (skip == 0) {
        state.gauges = [];
        state.ignoredGauges = 0;
      } else {
        if (count >= state.gauges.length + numGauges) {
          numGauges = state.gauges.length - 1 + numGauges;
        } else {
          numGauges = count;
        }
      }

      for (let i = skip; i < numGauges - state.ignoredGauges; i++) {
        const gaugeAddress = await gaugeControllerContract.gauges(i);
        console.log(gaugeAddress);
        if (!ignoredGauges.includes(gaugeAddress)) {
          const { gaugeName, gaugeWeight, totalRewards, dollarsPerVote } =
            await getGaugeInfo(
              provider,
              signer,
              gaugeAddress,
              gaugeControllerContract,
              i
            );
          let newGauge = {
            id: i,
            address: gaugeAddress,
            name: gaugeName,
            gaugeWeight,
            totalRewards,
            dollarsPerVote
          };
          gauges.push(newGauge);
        }
      }
    } else {
      state.ignoredGauges++;
    }
  } catch (e) {
    console.log('e', e);
  } finally {
    state.gauges.push(...gauges);
    state.gaugesLoading = false;
    state.showTable = true;
  }
}

async function getGaugeInfo(
  provider,
  signer,
  gaugeAddress,
  gaugeController,
  index
) {
  try {
    const bribeContract = new ethers.Contract(
      state.selectedProject.bribeAddress,
      bribeV3.abi,
      signer
    );
    let [gaugeType, gaugeWeight, rewards] = await Promise.all([
      gaugeController.gauge_types(gaugeAddress),
      gaugeController.get_gauge_weight(gaugeAddress),
      bribeContract.rewards_per_gauge(gaugeAddress)
    ]);

    console.log(gaugeType.toString());

    gaugeWeight = parseFloat(ethers.utils.formatUnits(gaugeWeight, 18));

    //calculate total dollar amounts
    let period = getActivePeriod();
    let totalRewards = 0;
    for (let i = 0; i < rewards.length; i++) {
      const token = new ethers.Contract(rewards[i], erc20.abi, signer);
      let decimals = BigNumber.from(await token.decimals()).toNumber();
      console.log(decimals);
      let bribeAmount = ethers.utils.formatUnits(
        await bribeContract._reward_per_gauge(period, gaugeAddress, rewards[i]),
        decimals
      );
      let { price } = await tokenPriceLogo(rewards[i]);
      let dollarAmount = bribeAmount * price;
      totalRewards += dollarAmount;
    }

    let dollarsPerVote = gaugeWeight > 0 ? totalRewards / gaugeWeight : 0;

    let name = 'Unknown';
    let tokenAddress = '';

    if (['0', '5', '6'].includes(gaugeType.toString())) {
      switch (state.selectedProject.name) {
        case 'FRAX': {
          const bytecode = await provider.getCode(gaugeAddress);
          const gaugeContract = new ethers.Contract(
            gaugeAddress,
            fraxGauge.abi,
            signer
          );
          try {
            if (
              bytecode.includes(ethers.utils.id('stakingToken()').slice(2, 10))
            ) {
              tokenAddress = await gaugeContract.stakingToken();
              const lpToken = new ethers.Contract(
                tokenAddress,
                erc20.abi,
                signer
              );
              name = await lpToken.name();
            }
            if (
              bytecode.includes(ethers.utils.id('uni_token0()').slice(2, 10))
            ) {
              let token1 = await gaugeContract.uni_token0();
              let token2 = await gaugeContract.uni_token1();
              const token1Contract = new ethers.Contract(
                token1,
                erc20.abi,
                signer
              );
              const token2Contract = new ethers.Contract(
                token2,
                erc20.abi,
                signer
              );
              let token1Name = await token1Contract.name();
              let token2Name = await token2Contract.name();
              name = `${token1Name}/${token2Name}`;
            }
            if (bytecode.includes(ethers.utils.id('name()').slice(2, 10))) {
              name = await gaugeContract.name();
            }
          } catch (e) {
            console.log(e);
          }
          break;
        }
        case 'ANGLE': {
          const gaugeContract = new ethers.Contract(
            gaugeAddress,
            angleGauge.abi,
            signer
          );
          tokenAddress = await gaugeContract.staking_token();
          const lpToken = new ethers.Contract(tokenAddress, erc20.abi, signer);
          name = await lpToken.name();
          break;
        }
        default: {
          const gaugeContract = new ethers.Contract(
            gaugeAddress,
            gauge.abi,
            signer
          );
          tokenAddress = await gaugeContract.lp_token();
          const lpToken = new ethers.Contract(tokenAddress, erc20.abi, signer);
          name = await lpToken.name();
          break;
        }
      }
    }

    if (name === 'Unknown') {
      //get gauge name from config file
      let item = GaugeNames.find(({ address }) => address === gaugeAddress);
      if (item) {
        name = item.name;
      }
    }

    return {
      gaugeName: name,
      gaugeWeight: gaugeWeight,
      totalRewards,
      dollarsPerVote,
      gaugeType: gaugeType
    };
  } catch (ex) {
    console.log('------------------------------------');
    console.log(
      `exception thrown in getGaugeInfo(${gaugeController}, ${index})`
    );
    console.log(ex);
    console.log('------------------------------------');
    return null;
  }
}

function getActivePeriod() {
  const WEEK = BigNumber.from(86400).mul(7);
  const date = Math.floor(new Date().getTime() / 1000);
  return Math.floor(date / WEEK) * WEEK;
}

async function tokenPriceLogo(token) {
  let url = `https://api.coingecko.com/api/v3/coins/ethereum/contract/${token}`;

  const response = await fetch(url);
  const body = await response.json();
  const data = {
    price: body.market_data ? body.market_data.current_price.usd : 0,
    logo: body.image ? body.image.large : null
  };
  return data;
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
  }

  try {
    const { ethereum } = window;
    if (ethereum) {
      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();

      const token = new ethers.Contract(state.bribeToken, erc20.abi, signer);
      let decimals = await token.decimals();
      let amount = ethers.utils.parseUnits(
        state.bribeAmount.toString(),
        decimals
      );

      let approveTx = await token.approve(
        state.selectedProject.bribeAddress,
        amount
      );
      console.log(approveTx);

      const bribeContract = new ethers.Contract(
        state.selectedProject.bribeAddress,
        bribeV3.abi,
        signer
      );
      let tx = await bribeContract.add_reward_amount(
        state.selectedGauge.address,
        state.bribeToken,
        amount
      );
      console.log(tx);

      state.bribeAmount = 0;
      state.bribeToken = '';

      loadGauges();
    }
  } catch (e) {
    console.log(e);
  }

  state.modalOpen = false;
}
</script>

<template>
  <div>
    <div id="content" class="flex h-full min-h-screen pt-[40px]">
      <BaseContainer class="w-full">
        <p>
          {{ state.selectedProject.name }}:
          <a target="_blank" :href="state.selectedProject.voteUrl">vote</a>
        </p>

        <ProjectsListbox
          v-model="state.selectedProject"
          :items="Projects"
          @update:modelValue="loadGauges(0)"
        />

        <table v-if="state.showTable" class="mb-10px w-full table-auto">
          <thead>
            <tr>
              <th>Title</th>
              <th>Total votes</th>
              <th>$/QI</th>
              <th>Total rewards</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="gauge in state.gauges" :key="gauge.title">
              <tr>
                <td>{{ gauge.name }}</td>
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

        <LoadingSpinner v-if="state.gaugesLoading" />
        <BaseButton
          class="z-10 !bg-skin-bg"
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

    <!--    <footer-->
    <!--      class="space-x-3 bg-skin-bg pb-[50px] pl-[50px] md:fixed md:right-0 md:bottom-0 md:bg-transparent md:p-4 2xl:pr-6"-->
    <!--    >-->
    <!--      <BaseLink-->
    <!--        v-for="social in socials"-->
    <!--        :key="social"-->
    <!--        :link="social.link"-->
    <!--        hide-external-icon-->
    <!--      >-->
    <!--        <BaseIcon-->
    <!--          size="28"-->
    <!--          class="text-skin-text opacity-40 transition-opacity hover:opacity-80"-->
    <!--          :name="social.icon"-->
    <!--        />-->
    <!--      </BaseLink>-->
    <!--    </footer>-->
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
