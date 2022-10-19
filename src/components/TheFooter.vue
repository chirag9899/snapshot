<script setup lang="ts">
const yearNow = new Date().getFullYear();

const snapshotTextLinks = [
  {
    text: 'about',
    link: {
      name: 'about'
    }
  },
  {
    text: 'blog',
    link: 'https://snapshot.mirror.xyz/'
  },
  {
    text: 'jobs',
    link: 'https://angel.co/company/snapshot-labs_/jobs'
  }
];

const resourcesTextLinks = [
  // {
  //   text: 'discussions',
  //   link: 'https://github.com/snapshot-labs/snapshot/discussions'
  // },
  {
    text: 'github',
    link: 'https://github.com/quicksnap-io'
  }
  // {
  //   text: 'docs',
  //   link: 'https://docs.snapshot.org/'
  // },
  // {
  //   text: 'support',
  //   link: 'https://discord.snapshot.org/'
  // }
];
</script>

<template>
  <div class="-mt-3 border-t" />
  <BaseContainer class="space-y-5 py-[40px] md:space-y-0">
    <div class="space-y-5 md:flex md:space-y-0">
      <FooterTitle class="mt-6 whitespace-nowrap text-center md:text-left">
        © {{ yearNow }} Quicksnap.
      </FooterTitle>
      <div
        class="flex justify-center space-x-[70px] text-center md:w-full md:text-left lg:ml-[60px] lg:justify-start"
      >
        <!--        <FooterLinks>-->
        <!--          <FooterTitle> Quicksnap </FooterTitle>-->
        <!--          <FooterLinksItem-->
        <!--            v-for="item in snapshotTextLinks"-->
        <!--            :key="item.text"-->
        <!--            :link="item.link"-->
        <!--          >-->
        <!--            {{ $t(`footerView.${item.text}`) }}-->
        <!--            <BasePill-->
        <!--              v-if="item.text === 'jobs'"-->
        <!--              class="ml-2 inline-block !rounded px-1 py-0 text-xs"-->
        <!--            >-->
        <!--              {{ $t('footerView.hiring') }}-->
        <!--            </BasePill>-->
        <!--          </FooterLinksItem>-->
        <!--        </FooterLinks>-->

        <!--        <FooterLinks>-->
        <!--          <FooterTitle> {{ $t('footerView.resources') }} </FooterTitle>-->

        <!--          <FooterLinksItem-->
        <!--            v-for="item in resourcesTextLinks"-->
        <!--            :key="item.text"-->
        <!--            :link="item.link"-->
        <!--          >-->
        <!--            {{ $t(`footerView.${item.text}`) }}-->
        <!--          </FooterLinksItem>-->
        <!--        </FooterLinks>-->
      </div>
      <div class="pb-1 md:hidden lg:mt-0 lg:block">
        <FooterTitle class="hidden whitespace-nowrap lg:block">
          Join Quicksnap community
        </FooterTitle>
        <FooterSocials />
      </div>
    </div>
  </BaseContainer>
</template>
