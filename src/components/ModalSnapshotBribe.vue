<script setup lang="ts">
import { ref } from 'vue';
import { ethers } from 'ethers';
import {
  addSnapshotRewardAmount,
  approveToken,
  getAllowance,
  tokenPriceLogo
} from '@/helpers/bribeContracts';
import { Proposal } from '@/helpers/interfaces';
import { shorten } from '@/helpers/utils';
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
let bribeToken = ref('');
let bribeAmount = ref(0);
let bribeOption = ref(1);
let tokenError = ref({ message: '', push: false });
let amountError = ref({ message: '', push: false });
let showBribeAddedMessage = ref(false);
let isApproved = ref(false);
let isApproveLoading = ref(false);
let isBribeLoading = ref(false);
const token = ref(clone(DEFAULT_TOKEN));

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

async function addBribe() {
  console.log(bribeToken.value, bribeAmount.value, bribeOption.value);
  tokenError.value.message = '';
  amountError.value.message = '';

  if (!ethers.utils.isAddress(bribeToken.value)) {
    tokenError.value.message = 'Please enter a valid token address';
    return;
  }

  if (token.value.name === '') {
    tokenError.value.message = 'Please enter a valid token address';
    return;
  }

  if (bribeAmount.value < 0 || !bribeAmount.value) {
    amountError.value.message = 'Please enter a valid token amount';
    return;
  }

  isBribeLoading.value = true;
  try {
    await addSnapshotRewardAmount(
      props.proposal.id,
      bribeOption.value,
      bribeAmount.value,
      bribeToken.value,
      props.proposal.start,
      props.proposal.end
    );

    showBribeAddedMessage.value = true;
    bribeAmount.value = 0;
    bribeToken.value = '';
    bribeOption.value = 1;
    isBribeLoading.value = false;
    emit('close');
  } catch (e) {
    emit('close');
    console.log(e);
    isBribeLoading.value = false;
  }
}

async function checkAllowance() {
  tokenError.value.message = '';
  amountError.value.message = '';
  try {
    if (!ethers.utils.isAddress(bribeToken.value)) {
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
        bribeToken.value,
        import.meta.env.VITE_BRIBE_SNAPSHOT_ADDRESS
      )
    );

    if (allowance > 0) {
      isApproved.value = true;
    } else {
      isApproved.value = false;
    }
  } catch (e) {
    console.log(e);
    isApproved.value = false;
  }
}

async function approve() {
  if (!ethers.utils.isAddress(bribeToken.value)) {
    tokenError.value.message = 'Please enter a valid token address';
    return;
  }
  isApproveLoading.value = true;
  try {
    isApproved.value = await approveToken(
      bribeToken.value,
      import.meta.env.VITE_BRIBE_SNAPSHOT_ADDRESS
    );
    isApproveLoading.value = false;
  } catch (e) {
    console.log(e);
    isApproveLoading.value = false;
  }
}

async function getTokenInfo() {
  tokenError.value.message = '';

  if (!bribeToken.value || !isAddress(bribeToken.value)) {
    tokenError.value.message = 'invalid address';
    token.value = clone(DEFAULT_TOKEN);
    return;
  }

  isTokenLoading.value = true;

  const { data } = await getTokenPrices(bribeToken.value, '1');
  console.log(data);
  // get the reward token price
  const { price } = await tokenPriceLogo(bribeToken.value);
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
        call(provider, ERC20ABI, [bribeToken.value, 'name', []]),
        call(provider, ERC20ABI, [bribeToken.value, 'symbol', []]),
        call(provider, ERC20ABI, [bribeToken.value, 'decimals', []])
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
  const bribeDollarAmount = token.value.price * bribeAmount.value;

  if (bribeDollarAmount < 10000) {
    amountError.value.message = 'Bribes must be at least $10.000 in value';
    return;
  } else {
    amountError.value.message = '';
    return;
  }
}

watch(
  [bribeToken],
  async () => {
    await getTokenInfo();
    await checkAllowance();
  },
  { deep: true }
);

watch(
  [bribeAmount],
  async () => {
    checkMinimumAmount();
  },
  { deep: true }
);
</script>

<template>
  <BaseModal :open="open" @close="$emit('close')">
    <template #header>
      <h4>Add incentive for {{ shorten(proposal.title, 20) }}</h4>
      <BaseContainer class="p-6">
        <InputString
          v-model="bribeToken"
          class="mb-2"
          :definition="{ title: 'token address' }"
          :error="tokenError"
        />
        <inputNumber
          v-model="bribeAmount"
          class="mb-2"
          :definition="{ title: 'incentive amount' }"
          :error="amountError"
        />
        <ChoicesListbox
          v-model="bribeOption"
          :items="proposal.choices"
          label="bribe option"
        />
        <BaseBlock v-if="token.name" class="!mt-3 space-x-1 text-left text-sm">
          <div class="flex justify-between">
            <div class="flex items-center gap-1 truncate">
              <AvatarToken
                v-if="token.logo"
                :src="token.logo"
                :address="bribeToken"
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
                :link="`https://etherscan.io/token/${bribeToken}`"
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
            amountError.message !== ''
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
          :loading="isBribeLoading"
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
</template>
