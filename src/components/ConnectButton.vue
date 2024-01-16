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
      disconnectConnectedWallet
    } = useOnboard();

    const connect = async () => {
      await connectWallet();
    };

    const set = () => setChain({ wallet: 'MetaMask', chainId: '0xa4ba' });

    const disconnect = async () => {
      await disconnectConnectedWallet({ label: connectedWallet.label });
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
  <!-- <span>Connected Chain: {{ connectedChain?.namespace }}</span> -->
  <span>Network: {{ connectedChain }}</span>
</template>
