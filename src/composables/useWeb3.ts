import { ethers } from 'ethers';
import { computed, reactive } from 'vue';
import { Web3Provider } from '@ethersproject/providers';
import { getInstance } from '@snapshot-labs/lock/plugins/vue3';
import networks from '@snapshot-labs/snapshot.js/src/networks.json';
import { formatUnits } from '@ethersproject/units';
import { supportedChain } from '@/helpers/supportedChains';
import {
  createWeb3Modal,
  defaultConfig,
  useWeb3Modal,
  useWeb3ModalState
} from '@web3modal/ethers5/vue';

let auth;
const defaultNetwork: any =
  import.meta.env.VITE_DEFAULT_NETWORK || Object.keys(networks)[0];

const projectId = '55f8e4a3ce3a3ad37353e8582b8db050';

const mainnet = {
  chainId: 1,
  name: 'Ethereum',
  currency: 'ETH',
  explorerUrl: 'https://etherscan.io',
  rpcUrl: import.meta.env.VITE_WEB3_ENDPOINT
};

const polygon = {
  chainId: 137,
  name: 'Polygon',
  currency: 'MATIC',
  explorerUrl: 'https://polygonscan.com/ ',
  rpcUrl: 'https://polygon-rpc.com/'
};

// 3. Create modal
const metadata = {
  name: 'QuickSnap Finance',
  description:
    'QuickSnap is a decentralized platform rewarding DAO governance token holders for actively participating in token protocol governance. It functions as a marketplace for governance incentives, streamlining the process for both initiators and users. This setup promotes voter engagement and offers users the chance to earn extra yields from their governance tokens through active involvement in governance activities.',
  url: 'https://quicksnap.finance/',
  icons: []
};

const wallet = createWeb3Modal({
  ethersConfig: defaultConfig({ metadata, defaultChainId: 0 }),
  chains: [mainnet, polygon],
  projectId,
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#211f24'
  }
});

const { open } = useWeb3Modal();

const state = reactive<{
  account: string;
  network: Record<string, any>;
  authLoading: boolean;
  walletConnectType: string | null;
}>({
  account: '',
  network: {},
  authLoading: false,
  walletConnectType: null
});

export function useWeb3() {
  async function login(connector = 'injected') {
    auth = getInstance();
    state.authLoading = true;
    await auth.login(connector);
    if (auth.provider.value) {
      auth.web3 = new Web3Provider(auth.provider.value, 'any');
      await loadProvider();
    }
    state.authLoading = false;
  }

  function checkNetwork() {
    const { selectedNetworkId } = useWeb3ModalState();
    handleChainChanged(selectedNetworkId);
  }

  function logout() {
    auth = getInstance();
    auth.logout();
    state.account = '';
    state.network = {};
  }

  function getProvider() {
    const { ethereum } = window;
    return state.account
      ? new ethers.providers.Web3Provider(ethereum)
      : ethers.getDefaultProvider(import.meta.env.VITE_WEB3_ENDPOINT);
  }

  async function loadProvider() {
    try {
      if (
        auth.provider.value.removeAllListeners &&
        !auth.provider.value.isTorus
      )
        auth.provider.value.removeAllListeners();
      if (auth.provider.value.on) {
        try {
          auth.provider.value.on('chainChanged', async chainId => {
            handleChainChanged(parseInt(formatUnits(chainId, 0)));
          });
          auth.provider.value.on('accountsChanged', async accounts => {
            if (accounts.length !== 0) {
              await login();
            }
          });
        } catch (e) {
          console.log(`failed to subscribe to events for provider: ${e}`);
        }
      }
      // console.log('Provider', auth.provider.value);
      let network, accounts;
      try {
        const connector = auth.provider.value?.connectorName;
        if (connector === 'gnosis') {
          const { chainId: safeChainId, safeAddress } = auth.web3.provider.safe;
          network = { chainId: safeChainId };
          accounts = [safeAddress];
        } else {
          [network, accounts] = await Promise.all([
            auth.web3.getNetwork(),
            auth.web3.listAccounts()
          ]);
        }
      } catch (e) {
        console.log(e);
      }
      // console.log('Network', network);
      // console.log('Accounts', accounts);
      handleChainChanged(network.chainId);
      const acc = accounts.length > 0 ? accounts[0] : null;

      state.account = acc;
      state.walletConnectType = auth.provider.value?.wc?.peerMeta?.name || null;
    } catch (e) {
      state.account = '';
      return Promise.reject(e);
    }
  }

  function handleChainChanged(chainId) {
    if (chainId === 1) {
      state.network = networks[chainId];
    } else {
      state.network = {};
      // open({ view: 'Networks' });
    }
  }

  function checkConnected() {
    const isConnected = wallet.getIsConnected();
    if (isConnected === true) {
      return true;
    } else {
      return false;
    }
  }

  return {
    checkConnected,
    open,
    login,
    checkNetwork,
    logout,
    getProvider,
    loadProvider,
    handleChainChanged,
    web3: computed(() => state),
    web3Account: computed(() => state.account)
  };
}
