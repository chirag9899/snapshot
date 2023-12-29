<script setup lang="ts">
const socials = [
  {
    icon: 'gitbook',
    link: 'https://quicksnap.gitbook.io/'
  },
  {
    icon: 'twitter',
    link: 'https://twitter.com/QuickSnap_Lab'
  },
  {
    icon: 'discord',
    link: 'https://discord.gg/zEnKNzBD3W'
  },
  {
    icon: 'github',
    link: `https://github.com/quicksnap-io/`
  }
];
</script>

<template>
  <div
    class="flex items-center justify-center space-x-3 pt-2 md:mt-4 md:justify-start lg:mt-0 lg:justify-end"
  >
    <span v-for="social in socials" :key="social.icon">
      <BaseLink :link="social.link" hide-external-icon>
        <FooterSocialsItem v-if="social.icon === 'github'">
          <i-s-github class="text-[24px]" />
        </FooterSocialsItem>
        <FooterSocialsItem v-else-if="social.icon === 'twitter'">
          <i-s-twitter class="text-[24px]" />
        </FooterSocialsItem>
        <FooterSocialsItem v-else-if="social.icon === 'gitbook'">
          <i-s-gitbook class="text-[24px]" />
        </FooterSocialsItem>
        <FooterSocialsItem v-else-if="social.icon === 'discord'">
          <i-s-discord class="text-[24px]" />
        </FooterSocialsItem>
      </BaseLink>
    </span>
  </div>
</template>
