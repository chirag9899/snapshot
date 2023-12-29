<script setup lang="ts">
import { shorten } from '@/helpers/utils';
import { useInfiniteScroll, watchDebounced } from '@vueuse/core';
import type { Header } from 'vue3-easy-data-table';

const route = useRoute();
const { validEnsTlds } = useEns();
const { formatCompactNumber } = useIntl();
const { loadExtendedSpace, extendedSpaces, spaceLoading } = useExtendedSpaces();
const {
  loadSpacesHome,
  loadMoreSpacesHome,
  loadingSpacesHome,
  loadingMoreSpacesHome,
  enableSpaceHomeScroll,
  spacesHome,
  spacesHomeMetrics
} = useSpaces();

const headers: Header[] = [
  { text: 'USER', value: 'name', sortable: true },
  { text: 'MEMBERS', value: 'followersCount', sortable: true },
  { text: 'VOTES', value: 'votesCount', sortable: true }
];

const queryInput = ref({
  search: (route.query.q as string) || '',
  category: route.query.category || undefined
});

const isSearchInputTld = computed(() => {
  if (!queryInput.value.search) return false;
  return validEnsTlds.includes(queryInput.value.search.split('.').pop() ?? '');
});

const totalSpaces = computed(() => {
  return spacesHomeMetrics.value.total;
});

const spaces = computed(() => {
  if (isSearchInputTld.value) {
    const space = extendedSpaces.value.find(
      s => s.id === queryInput.value.search
    );
    return space ? [space] : [];
  }
  const result = spacesHome.value;

  const filteredSpaces = result.filter(space => space.activeProposals > 0);

  return filteredSpaces;
});

function handleClickMore() {
  loadMoreSpacesHome(queryInput.value);
  enableSpaceHomeScroll.value = true;
}

function loadSpaces() {
  if (isSearchInputTld.value) return loadExtendedSpace(queryInput.value.search);
  loadSpacesHome(queryInput.value);
}

useInfiniteScroll(
  document,
  () => {
    if (enableSpaceHomeScroll.value) {
      loadMoreSpacesHome(queryInput.value);
    }
  },
  { distance: 250, interval: 500 }
);

watchDebounced(
  queryInput,
  () => {
    loadSpaces();
  },
  { deep: true, debounce: 300 }
);

onMounted(() => {
  loadSpaces();
});
</script>

<template>
  <div class="relative">
    <BaseContainer
      class="mb-4 flex flex-col flex-wrap items-center xs:flex-row md:flex-nowrap"
    >
      <div tabindex="-1" class="w-full md:max-w-[420px]">
        <TheSearchBar @update:input-search="queryInput.search = $event" />
      </div>

      <ExploreMenuCategories
        :metrics="spacesHomeMetrics.categories"
        @update:category="queryInput.category = $event"
      />

      <div
        v-if="spacesHomeMetrics.total"
        class="mt-2 whitespace-nowrap text-right text-skin-text xs:ml-auto xs:mt-0"
      >
        {{ $tc('spaceCount', [formatCompactNumber(spacesHomeMetrics.total)]) }}
      </div>
    </BaseContainer>

    <BaseContainer slim>
      <DataTableSkeltonLoading
        v-if="loadingSpacesHome || spaceLoading"
        is-spaces
      />
      <BaseNoResults
        v-if="spaces.length < 1 && !loadingSpacesHome && !spaceLoading"
        use-block
      />

      <EasyDataTable
        v-if="totalSpaces > 0 && spaces.length > 0"
        :headers="headers"
        :items="spaces"
        :pagination="false"
        :hide-footer="true"
        :rows-per-page="totalSpaces"
      >
        <template #item-name="item">
          <router-link
            :to="{ name: 'spaceProposals', params: { key: item.id } }"
            ><div class="flex items-center">
              <AvatarSpace
                :space="item"
                symbol-index="space"
                size="40"
                class="mr-1"
              />
              <div class="flex items-center justify-center gap-1 truncate">
                <span>{{ item.name }}</span>
                <IconVerifiedSpace v-if="item.verified" class="pt-[1px]" />
              </div>
            </div>
          </router-link>
        </template>
        <template #item-followersCount="item">
          <router-link
            :to="{ name: 'spaceProposals', params: { key: item.id } }"
          >
            <div class="items-center text-skin-text">
              {{
                $tc('members', item.followersCount, {
                  count: formatCompactNumber(item.followersCount)
                })
              }}
            </div>
          </router-link>
        </template>
        <template #item-votesCount="item">
          <router-link
            :to="{ name: 'spaceProposals', params: { key: item.id } }"
          >
            <div class="items-center text-skin-text">
              {{ formatCompactNumber(item.votesCount) }}
            </div>
          </router-link>
        </template>
      </EasyDataTable>
      <div
        v-if="
          !enableSpaceHomeScroll &&
          spacesHomeMetrics.total > spacesHome.length &&
          spaces.length > 0
        "
        class="px-3 text-center md:px-0"
      >
        <BaseButton class="mt-4 w-full" @click="handleClickMore">
          {{ $t('homeLoadmore') }}
        </BaseButton>
      </div>
      <div v-else-if="loadingMoreSpacesHome" class="mt-4 flex h-[46px]">
        <LoadingSpinner class="mx-auto" big />
      </div>
    </BaseContainer>
  </div>
</template>

<style lang="scss">
.vue3-easy-data-table {
  border: 2px solid red; /* Change border to red as an example */
}

/* Override table styles */
.vue3-easy-data-table__main.fixed-header.hoverable table thead tr th {
  background: #333; /* Change background color for header */
  color: #fff;
  padding: 15px 25px;
}

.vue3-easy-data-table__main.fixed-header.hoverable table tbody tr td {
  padding: 10px 15px; /* Adjust padding */
}

.vue3-easy-data-table__main.fixed-header.hoverable table tbody tr td {
  background: #444; /* Change background color for body */
  color: #fff;
}

.vue3-easy-data-table__footer {
  display: none;
}

// -----
.vue3-easy-data-table__header th.sortable.none .sortType-icon,
.vue3-easy-data-table__header th.sortable .sortType-icon {
  border-bottom-color: #fff !important;
}
.vue3-easy-data-table__main {
  background-color: transparent !important;
}
.vue3-easy-data-table {
  border: 0px !important;
}
table {
  border-collapse: initial !important;
  display: table;
  width: 100%;
  border-spacing: 0;
  margin: 0;
  border-spacing: 0px 15px !important;
}

table thead tr th {
  background: transparent !important;
  color: #fff !important;
  border-bottom: 0px !important;
  font-size: 18px !important;
}

table tbody tr td {
  padding: 15px 20px !important;
  font-size: 17px !important;
}

table tbody tr td {
  background: transparent !important;
  color: #fff !important;
  border-bottom: 1px solid !important;
  border-top: 1px solid !important;
  border-color: rgb(33, 70, 153) !important;
}

table tbody tr td:first-child {
  border-left: 1px solid !important;
  border-radius: 5px 0px 0px 5px !important;
  border-color: rgb(33, 70, 153) !important;
}

table tbody tr td:last-child {
  border-right: 1px solid !important;
  border-radius: 0px 5px 5px 0px !important;
  border-color: rgb(33, 70, 153) !important;
}
table tbody tr:hover td {
  border-color: rgb(42, 108, 255) !important;
  background-color: rgba(
    26,
    97,
    255,
    0.27
  ) !important; /* box-shadow: rgba(232, 57, 110, 0.5) 0px 0px 25px; */
  color: #fff;
}

table tbody tr:hover {
  box-shadow: rgba(42, 108, 255, 0.5) 0px 0px 25px !important;
}
</style>
