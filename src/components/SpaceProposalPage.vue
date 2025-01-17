<script setup lang="ts">
import { getIncentivesForProposal } from '@/helpers/quicksnapContracts';
import voting from '@snapshot-labs/snapshot.js/src/voting';
import { ExtendedSpace, Proposal, Results } from '@/helpers/interfaces';
import { ref } from 'vue';
import { commify } from '@/helpers/utils';
import ModalSnapshotIncentive from '@/components/ModalSnapshotIncentive.vue';

const props = defineProps<{ space: ExtendedSpace; proposal: Proposal }>();
const emit = defineEmits(['reload-proposal']);

useMeta({
  title: {
    key: 'metaInfo.space.proposal.title',
    params: {
      space: props.space.name,
      proposal: props.proposal.title
    }
  },
  description: {
    key: 'metaInfo.space.proposal.description',
    params: {
      body: props.proposal.body.slice(0, 160)
    }
  }
});

const route = useRoute();
const router = useRouter();
const { web3, web3Account } = useWeb3();
const { isMessageVisible, setMessageVisibility } = useFlaggedMessageStatus(
  route.params.id as string
);

const proposalId: string = route.params.id as string;
const environment = import.meta.env.VITE_ENV;

const modalOpen = ref(false);
const selectedChoices = ref<any>(null);
const loadedResults = ref(false);
const results = ref<Results | null>(null);

let modalIncentiveOpen = ref(false);
let currentIncentives = ref([]);
let incentivesLoading = ref(false);

const isAdmin = computed(() => {
  const admins = (props.space.admins || []).map(admin => admin.toLowerCase());
  return admins.includes(web3Account.value?.toLowerCase());
});

const isModerator = computed(() => {
  const moderators = (props.space.moderators || []).map(moderator =>
    moderator.toLowerCase()
  );
  return moderators.includes(web3Account.value?.toLowerCase());
});

const strategies = computed(
  // Needed for older proposal that are missing strategies
  () => props.proposal?.strategies ?? props.space.strategies
);

const browserHasHistory = computed(() => window.history.state.back);

const { modalAccountOpen, isModalPostVoteOpen } = useModal();
const { modalTermsOpen, termsAccepted, acceptTerms } = useTerms(props.space.id);

function clickVote() {
  !web3.value.account
    ? (modalAccountOpen.value = true)
    : !termsAccepted.value && props.space.terms
    ? (modalTermsOpen.value = true)
    : (modalOpen.value = true);
}

function reloadProposal() {
  emit('reload-proposal');
}

async function loadResults() {
  if (!props.proposal) return;
  await getIncentives();
  if (props.proposal.scores.length === 0) {
    const votingClass = new voting[props.proposal.type](
      props.proposal,
      [],
      strategies.value
    );
    results.value = {
      scores: votingClass.getScores(),
      scoresByStrategy: votingClass.getScoresByStrategy(),
      scoresTotal: votingClass.getScoresTotal()
    };
  } else {
    results.value = {
      scores: props.proposal.scores,
      scoresByStrategy: props.proposal.scores_by_strategy,
      scoresTotal: props.proposal.scores_total
    };
  }
  loadedResults.value = true;
}

function handleBackClick() {
  if (!browserHasHistory.value || browserHasHistory.value.includes('create'))
    return router.push({ name: 'spaceProposals' });
  return router.go(-1);
}

function handleChoiceQuery() {
  const choice = route.query.choice as string;
  if (web3Account.value && choice && props.proposal.state === 'active') {
    selectedChoices.value = parseInt(choice);
    clickVote();
  }
}

async function openIncentiveModal() {
  if (web3Account.value === '') {
    modalAccountOpen.value = true;
  } else {
    modalIncentiveOpen.value = true;
  }
}

async function getIncentives() {
  incentivesLoading.value = true;
  currentIncentives.value = await getIncentivesForProposal(
    props.proposal.id,
    props.proposal.choices
  );
  incentivesLoading.value = false;
}

watch(
  web3Account,
  () => {
    handleChoiceQuery();
  },
  { immediate: true }
);

onMounted(() => {
  loadResults();
});

onMounted(() => setMessageVisibility(props.proposal.flagged));
</script>

<template>
  <TheLayout v-bind="$attrs">
    <template #content-left>
      <div class="mb-3 px-3 md:px-0">
        <ButtonBack @click="handleBackClick" />
      </div>

      <MessageWarningFlagged
        v-if="isMessageVisible"
        type="proposal"
        @forceShow="setMessageVisibility(false)"
      />

      <template v-else>
        <div class="px-3 md:px-0">
          <SpaceProposalHeader
            :space="space"
            :proposal="proposal"
            :is-admin="isAdmin"
            :is-moderator="isModerator"
          />
          <BaseBlock
            class="important-notice mb-4"
            title="Important"
            :is-collapsable="false"
          >
            <p class="mb-2">
              QuickSnap's frontend integrates directly with Snapshot's backend,
              allowing voting on either platform. Votes made on QuickSnap are
              directly captured by Snapshot.
            </p>
            <p class="mb-2">
              QuickSnap enhances your experience by facilitating incentive
              provision and claims on our website. For voting, however, you can
              use Snapshot. We are an add-on to Snapshot's platform.
            </p>
          </BaseBlock>
          <SpaceProposalContent :space="space" :proposal="proposal" />
        </div>

        <div class="space-y-4">
          <div v-if="proposal?.discussion" class="px-3 md:px-0">
            <h3 v-text="$t('discussion')" />
            <BlockLink
              :link="proposal.discussion"
              data-testid="proposal-page-discussion-link"
            />
          </div>
          <!--          <SpaceProposalVote-->
          <!--            v-if="proposal?.state === 'active'"-->
          <!--            v-model="selectedChoices"-->
          <!--            :proposal="proposal"-->
          <!--            @open="modalOpen = true"-->
          <!--            @clickVote="clickVote"-->
          <!--          />-->
          <SpaceProposalVotesList :space="space" :proposal="proposal" />
          <SpaceProposalPlugins
            v-if="proposal?.plugins && loadedResults && results"
            :id="proposalId"
            :space="space"
            :proposal="proposal"
            :results="results"
            :loaded-results="loadedResults"
            :strategies="strategies"
          />
        </div>
      </template>
    </template>
    <template #sidebar-right>
      <div v-if="!isMessageVisible" class="mt-4 space-y-4 lg:mt-0">
        <SpaceProposalInformation
          :space="space"
          :proposal="proposal"
          :strategies="strategies"
        />
        <BaseBlock :loading="incentivesLoading" title="Incentives">
          <p class="mb-4">
            You can add a reward for voters that choose the desired option
          </p>
          <div v-if="currentIncentives.length > 0" class="mb-4">
            <h6>Current Incentives</h6>
            <div
              v-for="incentive in currentIncentives"
              :key="incentive"
              class="my-3"
            >
              <b>Vote - </b> <b>{{ incentive?.option }}</b>
              <span class="total_incentive mt-4 flex justify-between"
                ><b>Token </b>
                <b
                  >{{ commify(incentive.amount) }} {{ incentive.symbol }}</b
                ></span
              >
              <span class="total_rewards flex justify-between"
                ><b>Total Rewards </b>
                <b>${{ commify(incentive.dollarAmount, 3) }}</b></span
              >
            </div>
          </div>
          <BaseButton
            class="block w-full"
            primary
            :disabled="
              proposal.state != 'active' && environment === 'production'
            "
            @click="openIncentiveModal()"
            >Add Incentive
          </BaseButton>
          <br />
          <router-link :to="{ name: 'rewards' }">
            <BaseButton class="block w-full" primary>Check rewards</BaseButton>
          </router-link>
        </BaseBlock>
        <SpaceProposalResults
          :loaded="loadedResults"
          :space="space"
          :proposal="proposal"
          :results="results"
          :strategies="strategies"
          :is-admin="isAdmin"
          @reload="reloadProposal()"
        />
        <SpaceProposalPluginsSidebar
          v-if="proposal.plugins && loadedResults && results"
          :id="proposalId"
          :space="space"
          :proposal="proposal"
          :results="results"
          :loaded-results="loadedResults"
          :strategies="strategies"
        />
      </div>
      <ModalSnapshotIncentive
        :proposal="proposal"
        :open="modalIncentiveOpen"
        @close="modalIncentiveOpen = false"
      />
    </template>
  </TheLayout>
  <teleport to="#modal">
    <ModalVote
      :open="modalOpen"
      :space="space"
      :proposal="proposal"
      :selected-choices="selectedChoices"
      :strategies="strategies"
      @close="modalOpen = false"
      @reload="reloadProposal()"
      @openPostVoteModal="isModalPostVoteOpen = true"
    />
    <ModalTerms
      :open="modalTermsOpen"
      :space="space"
      :action="$t('modalTerms.actionVote')"
      @close="modalTermsOpen = false"
      @accept="acceptTerms(), (modalOpen = true)"
    />
    <ModalPostVote
      :open="isModalPostVoteOpen"
      :space="space"
      :proposal="proposal"
      :selected-choices="selectedChoices"
      @close="isModalPostVoteOpen = false"
    />
  </teleport>
</template>

<style scoped lang="scss">
.important-notice {
  border-color: #ffbd00;
}

.total_incentive {
  border-top: 0.3px solid #8b949e4f;
  padding: 10px 0px 5px 0px;
}

.total_incentive b:first-child {
  color: #fff;
}

.total_rewards {
  border-bottom: 0.3px solid #8b949e4f;
  padding: 5px 0px 10px 0px;
}

.total_rewards b:first-child {
  color: #fff;
}
</style>
