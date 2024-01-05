<script setup lang="ts">
import { ref } from 'vue';
import { ethers } from 'ethers';
import {
  addSnapshotRewardAmount,
  approveToken,
  getAllowance,
  tokenPriceLogo,
  getTokenBalance
} from '@/helpers/quicksnapContracts';
import { Proposal } from '@/helpers/interfaces';
import { commify, shorten } from '@/helpers/utils';
import { isAddress } from '@ethersproject/address';
import { call, clone } from '@snapshot-labs/snapshot.js/src/utils';
import { getTokenPrices } from '@/helpers/covalent';
import { JsonRpcProvider } from '@ethersproject/providers';
import { ERC20ABI } from '@/helpers/abi';

const DEFAULT_TOKEN = {
  name: '',
  logo: '',
  standard: 'ERC-20',
  symbol: '',
  decimals: null,
  price: 0
};

const isTokenLoading = ref(false);
let rewardToken = ref('');
let rewardAmount = ref(0);
let rewardOption = ref(1);
let tokenError = ref({ message: '', push: false });
let amountError = ref({ message: '', push: false });
let showRewardAddedMessage = ref(false);
let showRewardErrorMessage = ref(false);
let isApproved = ref(false);
let isApproveLoading = ref(false);
let isRewardLoading = ref(false);
const token = ref(clone(DEFAULT_TOKEN));
let availableAmount = ref(0);

const props = defineProps<{
  open: boolean;
  title?: string;
  showCancel?: boolean;
  disabled?: boolean;
  proposal: Proposal;
}>();

const emit = defineEmits(['close', 'confirm']);

const { open, proposal } = toRefs(props);
console.log(proposal);

async function addReward() {
  console.log(rewardToken.value, rewardAmount.value, rewardOption.value);
  tokenError.value.message = '';
  amountError.value.message = '';

  if (!ethers.utils.isAddress(rewardToken.value)) {
    tokenError.value.message = 'Please enter a valid token address';
    return;
  }

  if (token.value.name === '') {
    tokenError.value.message = 'Please enter a valid token address';
    return;
  }

  if (rewardAmount.value < 0 || !rewardAmount.value) {
    amountError.value.message = 'Please enter a valid token amount';
    return;
  }

  isRewardLoading.value = true;
  try {
    await addSnapshotRewardAmount(
      props.proposal.id,
      rewardOption.value,
      rewardAmount.value,
      rewardToken.value,
      props.proposal.start,
      props.proposal.end
    );

    showRewardAddedMessage.value = true;
    rewardAmount.value = 0;
    rewardToken.value = '';
    rewardOption.value = 1;
    isRewardLoading.value = false;
    emit('close');
  } catch (e) {
    emit('close');
    showRewardErrorMessage.value = true;
    console.log(e);
    isRewardLoading.value = false;
  }
}

async function checkAllowance() {
  try {
    if (!ethers.utils.isAddress(rewardToken.value)) {
      tokenError.value.message = 'Please enter a valid token address';
      isApproved.value = false;
      return;
    }

    if (token.value.name === '') {
      tokenError.value.message = 'Please enter a valid token address';
      isApproved.value = false;
      return;
    }

    const allowance = parseFloat(
      await getAllowance(
        rewardToken.value,
        import.meta.env.VITE_QUICKSNAP_ADDRESS
      )
    );

    const balance = parseFloat(await getTokenBalance(rewardToken.value));

    if (balance >= rewardAmount.value) {
      isApproved.value = true;
    } else {
      isApproved.value = false;
      amountError.value.message = 'Amount is bigger than balance';
      return;
    }

    if (allowance >= rewardAmount.value) {
      isApproved.value = true;
    } else {
      isApproved.value = false;
      amountError.value.message = 'Amount is bigger than allowance';
      return;
    }
  } catch (e) {
    console.log(e);
    isApproved.value = false;
  }
}

async function setMax() {
  try {
    const balance = parseFloat(await getTokenBalance(rewardToken.value));
    rewardAmount.value = balance;
  } catch (e) {
    console.log(e);
  }
}

async function approve() {
  if (!ethers.utils.isAddress(rewardToken.value)) {
    tokenError.value.message = 'Please enter a valid token address';
    return;
  }
  isApproveLoading.value = true;
  try {
    isApproved.value = await approveToken(
      rewardToken.value,
      import.meta.env.VITE_QUICKSNAP_ADDRESS
    );
    isApproveLoading.value = false;
  } catch (e) {
    console.log(e);
    isApproveLoading.value = false;
  }
}

async function getTokenInfo() {
  if (!rewardToken.value || !isAddress(rewardToken.value)) {
    tokenError.value.message = 'invalid address';
    token.value = clone(DEFAULT_TOKEN);
    return;
  }

  isTokenLoading.value = true;

  const balance = parseFloat(await getTokenBalance(rewardToken.value));
  availableAmount.value = balance;

  const { data } = await getTokenPrices(rewardToken.value, '1');
  // console.log("price data from api call....")
  // console.log(data);
  // get the reward token price
  const { price } = await tokenPriceLogo(rewardToken.value);
  token.value.price = price;

  if (data?.[0]?.contract_name) {
    token.value.name = data[0].contract_name;
    token.value.logo = data[0].logo_url;
    token.value.symbol = data[0].contract_ticker_symbol;
    token.value.decimals = data[0].contract_decimals;
    isTokenLoading.value = false;
  } else {
    try {
      const provider = new JsonRpcProvider(import.meta.env.VITE_WEB3_ENDPOINT);
      const tokenInfo = await Promise.all([
        call(provider, ERC20ABI, [rewardToken.value, 'name', []]),
        call(provider, ERC20ABI, [rewardToken.value, 'symbol', []]),
        call(provider, ERC20ABI, [rewardToken.value, 'decimals', []])
      ]);
      token.value.name = tokenInfo[0];
      token.value.symbol = tokenInfo[1];
      token.value.decimals = tokenInfo[2];
    } catch {
      tokenError.value.message = 'Token not found';
      token.value = clone(DEFAULT_TOKEN);
    } finally {
      isTokenLoading.value = false;
    }
  }
}

function checkMinimumAmount() {
  console.log('get token price....');
  console.log(token.value.price);
  const rewardDollarAmount = token.value.price * rewardAmount.value;

  if (rewardDollarAmount < 1) {
    amountError.value.message = `Incentives must be at least $1 in value, now it is $${rewardDollarAmount}`;
  }
  return;
}

watch(
  [rewardToken],
  async () => {
    tokenError.value.message = '';
    await getTokenInfo();
    await checkAllowance();
  },
  { deep: true }
);

watch(
  [rewardAmount],
  async () => {
    tokenError.value.message = '';
    amountError.value.message = '';
    await checkAllowance();
    checkMinimumAmount();
  },
  { deep: true }
);
</script>

<template>
  <BaseModal :open="open" class="incentive_modal" @close="$emit('close')">
    <template #header>
      <h4>Add incentive for {{ shorten(proposal.title, 20) }}</h4>
      <BaseContainer class="base_container p-6">
        <InputString
          v-model="rewardToken"
          class="mb-2"
          :definition="{ title: 'token address' }"
          :error="tokenError"
        />

        <div class="shadow-sm incentive_amount relative mt-2 flex rounded-md">
          <div class="available_amount">
            <span>available :</span>
            <span> {{ availableAmount }}</span>
          </div>
          <div class="relative flex flex-grow items-stretch focus-within:z-10">
            <inputNumber
              v-model="rewardAmount"
              class="mb-2"
              :definition="{ title: 'incentive amount' }"
              :error="amountError"
            />
          </div>
          <BaseButton
            :disabled="token.name === ''"
            class="primary mt-4"
            @click="setMax()"
            >Max
          </BaseButton>
        </div>
        <ChoicesListbox
          v-model="rewardOption"
          :items="proposal.choices"
          label="preferred option"
        />
        <BaseBlock v-if="token.name" class="!mt-3 space-x-1 text-left text-sm">
          <div class="flex justify-between">
            <div class="flex items-center gap-1 truncate">
              <AvatarToken
                v-if="token.logo"
                :src="token.logo"
                :address="rewardToken"
                class="mr-1"
                size="30"
              />
              <div class="truncate">
                <div class="mr-4 truncate whitespace-nowrap text-skin-link">
                  {{ token.name }}
                </div>
                <BasePill class="py-1">${{ token.symbol }}</BasePill>
              </div>
            </div>
            <div class="flex items-center">
              <BaseLink
                class="text-skin-text hover:text-skin-link"
                :link="`https://etherscan.io/token/${rewardToken}`"
              >
                {{ $t('setup.strategy.tokenVoting.seeOnEtherscan') }}
              </BaseLink>
            </div>
          </div>
        </BaseBlock>
        <BaseButton
          :disabled="
            isApproved ||
            tokenError.message !== '' ||
            amountError.message !== 'Amount is bigger than allowance'
          "
          :loading="isApproveLoading"
          class="primary mr-4 mt-4"
          @click="approve()"
          >Approve
        </BaseButton>
        <BaseButton
          :disabled="
            !isApproved ||
            tokenError.message !== '' ||
            amountError.message !== ''
          "
          :loading="isRewardLoading"
          class="primary ml-4 mt-4"
          @click="addReward()"
          >Add Incentive
        </BaseButton>
      </BaseContainer>
    </template>
  </BaseModal>
  <ModalNotice
    :open="showRewardAddedMessage"
    title="Done!"
    @close="showRewardAddedMessage = false"
  >
    <p>
      Your incentive will be added in a few minutes when confirmed by the
      blockchain
    </p>
  </ModalNotice>
  <ModalNotice
    :open="showRewardErrorMessage"
    title="Error"
    @close="showRewardErrorMessage = false"
  >
    <p>
      Something has gone wrong, please check your inputs and try again later.
    </p>
  </ModalNotice>
</template>
<style scoped>
.available_amount {
  position: absolute;
  right: 5px;
  top: 0px;
  min-width: 150px;
  display: flex;
  gap: 3px;
}
.modal .shell {
  height: 600px !important;
}
.incentive_amount {
  height: 135px;
}
.base_container .w-full {
  height: 105px;
}
</style>
