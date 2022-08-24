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
import projects from '../../supportedProjects.json';
import { ethers } from 'ethers';
import { BigNumber } from '@ethersproject/bignumber';
import gaugeController from '../abi/gaugeController.json';
import gauge from '../abi/gauge.json';
import bribeV3 from '../abi/bribev3.json';
import erc20 from '../abi/erc20.json';
import { commify } from '@/helpers/utils';

const { setPageTitle } = useI18n();
const { userTheme } = useSkin();
const { env } = useApp();

const themeBefore = userTheme.value;

const state = reactive({
  selectedProject: projects[0],
  gaugesLoading: true,
  gauges: [],
  showTable: false,
  modalOpen: false,
  selectedGauge: false,
  bribeToken: '',
  bribeAmount: 0,
  tokenError: {},
  amountError: {}
});

loadGauges();

async function loadGauges(skip = 0) {
  //ToDo: get lp token from frax and angle
  //ToDo: show claimable rewards for all projects
  //ToDo: get rewards for all projects in backend
  //ToDo: create json for adding manual gauge names
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
      } else {
        if (count >= state.gauges.length + numGauges) {
          numGauges = state.gauges.length - 1 + 5;
        } else {
          numGauges = count;
        }
      }

      for (let i = skip; i < numGauges; i++) {
        const {
          gaugeAddress,
          lpTokenAddress,
          gaugeName,
          gaugeWeight,
          totalRewards,
          dollarsPerVote
        } = await getGaugeInfo(signer, gaugeControllerContract, i);
        let newGauge = {
          id: i,
          address: gaugeAddress,
          lpTokenAddress,
          name: gaugeName,
          gaugeWeight,
          totalRewards,
          dollarsPerVote
        };
        gauges.push(newGauge);
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

async function getGaugeInfo(signer, gaugeController, index) {
  try {
    const gaugeAddress = await gaugeController.gauges(index);
    console.log(gaugeAddress);
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
      console.log(bribeAmount.toString());
      let { price } = await tokenPriceLogo(rewards[i]);
      console.log(price.toString());
      let dollarAmount = bribeAmount * price;
      console.log('$', dollarAmount);
      totalRewards += dollarAmount;
    }

    let dollarsPerVote = gaugeWeight > 0 ? totalRewards / gaugeWeight : 0;

    let name = 'Unknown';
    let lpTokenAddress = '';

    if (['0', '5', '6'].includes(gaugeType.toString())) {
      const gaugeContract = new ethers.Contract(
        gaugeAddress,
        gauge.abi,
        signer
      );
      let lpTokenAddress = await gaugeContract.lp_token();
      // if not 0, we cant get LP token info because it is on a different chain
      const lpToken = new ethers.Contract(lpTokenAddress, erc20.abi, signer);
      name = await lpToken.name();
    } else {
      //manually map gauge names
      switch (gaugeAddress) {
        case '0xb9C05B8EE41FDCbd9956114B3aF15834FDEDCb54':
          name = 'Curve.fi DAI/USDC (DAI+USDC)';
          break;
        case '0xfE1A3dD8b169fB5BF0D5dbFe813d956F39fF6310':
          name = 'Curve.fi fUSDT/DAI/USDC';
          break;
        case '0xC48f4653dd6a9509De44c92beb0604BEA3AEe714':
          name = 'Curve.fi amDAI/amUSDC/amUSDT';
          break;
        case '0x6955a55416a06839309018A8B0cB72c4DDC11f15':
          name = 'Curve.fi USD-BTC-ETH';
          break;
        case '0x488E6ef919C2bB9de535C634a80afb0114DA8F62':
          name = 'Curve.fi amWBTC/renBTC';
          break;
        case '0xfDb129ea4b6f557b07BcDCedE54F665b7b6Bc281':
          name = 'Curve.fi WBTC/renBTC';
          break;
        case '0x060e386eCfBacf42Aa72171Af9EFe17b3993fC4F':
          name = 'Curve USD-BTC-ETH';
          break;
        case '0x6C09F6727113543Fd061a721da512B7eFCDD0267':
          name = 'Curve.fi wxDAI/USDC/USDT';
          break;
        case '0xDeFd8FdD20e0f34115C7018CCfb655796F6B2168':
          name = 'Curve.fi USD-BTC-ETH';
          break;
        case '0xd8b712d29381748dB89c36BCa0138d7c75866ddF':
          name = 'Curve.fi Factory USD Metapool: Magic Internet Money 3Pool';
          break;
        case '0xFf17560d746F85674FE7629cE986E949602EF948':
          name = 'Arbitrum.curve.fi USDT/USDC (USDT+USDC)';
          break;
        case '0x9044E12fB1732f88ed0c93cfa5E9bB9bD2990cE5':
          name = 'Arbitrum.curve.fi USDT/wBTC/ETH (USDT + wBTC + ETH)';
          break;
        case '0x9F86c5142369B1Ffd4223E5A2F2005FC66807894':
          name = 'Arbitrum.curve.fi wBTC/renBTC (wBTC + renBTC)';
          break;
        case '0x260e4fBb13DD91e187AE992c3435D0cf97172316':
          name = 'Ftm.curve.fi fUSDT/wBTC/wETH (fUSDT + wBTC + wETH)';
          break;
        case '0xB504b6EB06760019801a91B451d3f7BD9f027fC9':
          name = 'Avax.curve.fi aDAI/aUSDC/aUSDT (aDAI + aUSDC + aUSDT)';
          break;
        case '0x75D05190f35567e79012c2F0a02330D3Ed8a1F74':
          name = 'Avax.curve.fi wBTC.e/renBTC.e (wBTC.e + renBTC.e)';
          break;
        case '0xa05E565cA0a103FcD999c7A7b8de7Bd15D5f6505':
          name =
            'Avax.curve.fi DAI.e/USDC.e/USDT.e/wBTC.e/wETH (DAI.e + USDC.e + USDT.e + wBTC.e + wETH)';
          break;
        case '0xf2Cde8c47C20aCbffC598217Ad5FE6DB9E00b163':
          name = 'Harmony.curve.fi DAI/USDC/USDT (DAI + USDC + USDT)';
          break;
        case '0x56eda719d82aE45cBB87B7030D3FB485685Bea45':
          name = 'Arbitrum.curve.fi EURS/USDC/USDT (EURS + USDC + USDT)';
          break;
        case '0xAF78381216a8eCC7Ad5957f3cD12a431500E0B0D':
          name =
            'Polygon.curve.fi EURt/DAI/USDC/USDT (EURt + DAI + USDC + USDT)';
          break;
        case '0xc1c5B8aAfE653592627B54B9527C7E98326e83Ff':
          name = 'Ftm.curve.fi FTM/FTML (FTM + fantom-l)';
          break;
        case '0x1c77fB5486545810679D53E325d5bCf6C6A45081':
          name = 'Ftm.curve.fi MIM/FUSDT/USDC (MIM + FUSDT + USDC)';
          break;
        case '0x9562c4D2E06aAf85efC5367Fb4544ECeB788465E':
          name = 'Curve.fi UST 3pool-f Gauge Deposit ';
          break;
        case '0xbAF05d7aa4129CA14eC45cC9d4103a9aB9A9fF60':
          // not found
          name = 'Fundraising gauge';
          break;
        case '0xfbb5b8f2f9b7a4d21ff44dC724C1Fb7b531A6612':
          name = 'Avax.curve.fi AVAX/AVAXL-f Gauge deposit';
          break;
        case '0xA6ff75281eACa4cD5fEEb333e8E15558208295e5':
          name = 'Ftm.curve.fi USDL-3CRV-f Gauge Deposit';
          break;
        case '0x1AEAA1b998307217D62E9eeFb6407B10598eF3b8':
          name = 'Avax.curve.fi UST/USDC/USDt (UST + USDC + USDt)';
          break;
        case '0x18006c6A7955Bf6Db72DE34089B975f733601660':
          name = 'Curve EURS-3Crv (crvEURSUSD)';
          break;
        case '0xd0698b2E41C42bcE42B51f977F962Fd127cF82eA':
          name = 'Curve.fi 4POOL-f Gauge Deposit';
          break;
        default:
      }
    }

    return {
      gaugeAddress: gaugeAddress,
      lpTokenAddress: lpTokenAddress,
      gaugeName: name,
      gaugeWeight: gaugeWeight,
      totalRewards,
      dollarsPerVote,
      gaugeType: gaugeType,
      logo: '/unknown-logo.png'
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
          :items="projects"
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
