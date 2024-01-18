<script>
import { reactive, ref } from 'vue';
import { useConnectButton } from '@/composables/onboard';
import { supportedChain } from '@/helpers/supportedChains';
import ModalPostVote from '@/components/ModalPostVote.vue';

export default {
  name: 'ConnectButton',
  setup() {
    const {
      connect,
      connectedWallet,
      connectedChain,
      set,
      disconnect,
      userAddress,
      ethersProvider
    } = useConnectButton();

    // watch(ethersProvider, (newAddress) => {
    //   console.log("shit", newAddress.provider)
    //   // console.log("Address changed to", newAddress);
    // });

    // const chainId = parseInt(connectedChain?.id, 16);
    return {
      connect,
      connectedWallet,
      connectedChain,
      set,
      disconnect,
      userAddress,
      supportedChain
    };
  }
};
</script>

<template>
  <div class="flex items-center justify-center gap-4">
    <button
      v-if="!connectedWallet?.provider"
      class="rounded bg-yellow-500 px-4 py-2 text-black"
      @click="connect"
    >
      Connect
    </button>
    <button
      v-else
      class="rounded bg-yellow-500 px-4 py-2 text-black"
      @click="disconnect"
    >
      Disconnect
    </button>
  </div>
</template>

<!-- 
<script>
import { ref, onMounted, watch } from 'vue';
import { useOnboard } from '@web3-onboard/vue';



export default {
  name: 'ConnectButton',
  setup() {
    const {
      connectWallet,
      connectedWallet,
      connectedChain,
      setChain,
      getChain,
      disconnectConnectedWallet,
      wallets
      
    
    } = useOnboard();

    const connect = async () => {
      await connectWallet();
    };
    console.log(
      "lol",wallets
    )

    const set = () => setChain({ wallet: 'MetaMask', chainId: '0xa4ba' });

    const disconnect = async () => {
      console.log(
      "mom",wallets.value[0].accounts[0].address
    )
      // await disconnectConnectedWallet({ label: connectedWallet.label });
    };
    return {
      connect,
      connectedWallet,
      connectedChain,
      set,
      disconnect
    };
  }
};
</script>

<template>
  <button type="button" @click="connect">Connect</button>
  <button type="button" @click="disconnect">disconnect</button>
  <button type="button" @click="set">Set chain</button>

  <span>Network: {{ connectedChain }}</span>

</template> -->
