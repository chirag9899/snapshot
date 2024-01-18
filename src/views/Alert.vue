<template>
  <div
    v-if="alertOpen"
    class="left-0 right-0 top-0 z-50 mb-4 flex h-5 items-center justify-center rounded border-0 bg-[#f35354] px-6 py-4 text-white"
  >
    <span class="mr-5 inline-block align-middle text-xl">
      <i class="fas fa-bell"></i>
    </span>
    <span class="mr-8 inline-block align-middle">
      <b class="capitalize"></b> {{ message }}
    </span>
    <!-- <button
      class="absolute right-0 top-0 mr-6 mt-2 bg-transparent text-xl font-extralight leading-none outline-none focus:outline-none"
      @click="closeAlert()"
    >
      <span class="font-thin text-white">×</span>
    </button> -->
  </div>
</template>

<script>
export default {
  name: 'RedAlert',
  props: {
    message: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      alertOpen: true
    };
  },
  methods: {
    closeAlert: function () {
      this.alertOpen = false;
    }
  }
};
</script>

<style scoped>
.custom-bg-red {
  /* background-color: #2c191b;  */
  background-color: rgb(
    38 38 38
  ); /* This is the color for bg-red-800 in Tailwind CSS */
}
</style>
