import erc20 from '@/abi/erc20.json';
import { BigNumber } from '@ethersproject/bignumber';
import { ethers } from 'ethers';
import gql from 'graphql-tag';
import { ApolloClient, InMemoryCache } from '@apollo/client/core';
import { tokenPriceLogo } from '@/helpers/quicksnapContracts';
import merkle from '@/abi/merkle.json';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const { getProvider, login, web3Account, checkNetwork, getReadOnlyProvider } =
  useWeb3();
const MERKLE_ADDRESS = import.meta.env.VITE_MERKLE_ADDRESS;

export async function getRewards() {
  try {
    await login();
    console.log('web3account', web3Account.value);

    const claims = [];
    let claimInfo = { totalBalance: 0, totalClaimed: 0 };

    if (web3Account.value) {
      const client = new ApolloClient({
        uri: `${import.meta.env.VITE_API_ENDPOINT}/graphql`,
        cache: new InMemoryCache()
      });

      const claimsQuery = gql`
        query rewarderewards($account: String!) {
          claims(account: $account) {
            token
            index
            amount
            merkleProof
          }
          claimInfo {
            totalBalance
            totalClaimed
          }
        }
      `;
      const { data } = await client.query({
        query: claimsQuery,
        variables: { account: web3Account.value }
      });
      claimInfo = data.claimInfo;

      for (let i = 0; i < data.claims.length; i++) {
        const token = await getTokenInfo(data.claims[i].token);
        const tokenData = await tokenPriceLogo(data.claims[i].token);
        if (token) {
          const claim = {
            version: 3,
            claimable: parseFloat(
              ethers.utils.formatUnits(data.claims[i].amount, token.decimals)
            ),
            claimableRaw: BigNumber.from(data.claims[i].amount),
            canClaim: true,
            hasClaimed: false,
            rewardToken: token,
            claimData: data.claims[i],
            rewardTokenPrice: tokenData.price,
            rewardTokenLogo: tokenData.logo
          };
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          claims.push(claim);
        }
      }
    }
    return { rewards: claims, claimInfo };
  } catch (e) {
    console.log(e);
    return [];
  }
}

export async function getTokenInfo(
  tokenAddress
): Promise<{ address: string; symbol: string; decimals: number } | undefined> {
  try {
    const provider = getReadOnlyProvider();
    const token = new ethers.Contract(tokenAddress, erc20.abi, provider);

    const [symbol, decimals] = await Promise.all([
      token.symbol(),
      token.decimals()
    ]);

    return {
      address: tokenAddress,
      symbol,
      decimals: parseInt(decimals)
    };
  } catch (ex) {
    console.log('------------------------------------');
    console.log(`exception thrown in _getTokenInfo(${tokenAddress})`);
    console.log(ex);
    console.log('------------------------------------');
  }
}

export async function getTokenNameBalance(
  tokenAddress
): Promise<{ name: string; symbol: string; balance: number } | undefined> {
  try {
    await login();
    const provider = getReadOnlyProvider();
    const token = new ethers.Contract(tokenAddress, erc20.abi, provider);

    const [name, symbol, balance, decimals] = await Promise.all([
      token.name(),
      token.symbol(),
      token.balanceOf(web3Account.value),
      token.decimals()
    ]);

    return {
      name,
      symbol,
      balance: parseFloat(ethers.utils.formatUnits(balance, parseInt(decimals)))
    };
  } catch (ex) {
    console.log('------------------------------------');
    console.log(`exception thrown in _getTokenInfo(${tokenAddress})`);
    console.log(ex);
    console.log('------------------------------------');
  }
}

export async function claimReward(reward) {
  await checkNetwork();
  await login();
  const provider = getProvider();
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const signer = provider.getSigner();
  const merkleContract = await new ethers.Contract(
    MERKLE_ADDRESS,
    merkle.abi,
    signer
  );
  const tx = await merkleContract.claim(
    reward.claimData.token,
    reward.claimData.index,
    web3Account.value,
    reward.claimData.amount,
    reward.claimData.merkleProof
  );
  console.log(tx);
}

export async function claimAllRewards(rewards) {
  await checkNetwork();
  await login();
  //prepare array
  const claims = [];
  const provider = getProvider();
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const signer = provider.getSigner();
  for (let i = 0; i < rewards.length; i++) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    claims.push({
      token: rewards[i].claimData.token,
      index: rewards[i].claimData.index,
      amount: rewards[i].claimData.amount,
      merkleProof: rewards[i].claimData.merkleProof
    });
  }

  const merkleContract = await new ethers.Contract(
    MERKLE_ADDRESS,
    merkle.abi,
    signer
  );
  const tx = await merkleContract.claimMulti(web3Account.value, claims);
  console.log(tx);
}
