// onboard.ts
import { ref, onMounted, watch } from 'vue';
import { ethers } from 'ethers';
import { useOnboard } from '@web3-onboard/vue';

export function useConnectButton() {
  const userAddress = ref('');
  const ethersProvider = ref<ethers.providers.Web3Provider>();

  const {
    connectWallet,
    connectedWallet,
    connectedChain,
    setChain,
    getChain,
    disconnectConnectedWallet,
    connectingWallet
  } = useOnboard();

  const connect = async () => {
    await connectWallet();
  };

  const set = () => setChain({ wallet: 'MetaMask', chainId: '0xa4ba' });

  const disconnect = async () => {
    // console.log(
    //   "mom",wallets.value[0].accounts[0].address
    // )
    await disconnectConnectedWallet();
    location.reload();
  };

  watch(connectedWallet, newWallet => {
    if (newWallet && newWallet.provider) {
      userAddress.value = newWallet.accounts[0].address;
    }
  });

  watch(connectedWallet, newWallet => {
    if (newWallet && newWallet.provider) {
      ethersProvider.value = new ethers.providers.Web3Provider(
        newWallet.provider,
        'any'
      );
    }
  });

  console.log(userAddress);

  // userAddress.value = wallets?.value[0]?.accounts[0]?.address;
  // console.log(userAddress)

  return {
    connect,
    connectedWallet,
    connectedChain,
    set,
    disconnect,
    userAddress,
    ethersProvider,
    connectingWallet
  };
}
