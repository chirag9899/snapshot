import angleGauge from '@/abi/angleGauge.json';
import bribeV3 from '@/abi/bribev3.json';
import bribeV3Snapshot from '@/abi/bribev3snapshot.json';
import erc20 from '@/abi/erc20.json';
import gauge from '@/abi/gauge.json';
import { getContractName } from '@/helpers/etherscan';
import { getTokenInfo } from '@/helpers/rewards';
import { ApolloClient, InMemoryCache } from '@apollo/client/core';
import { BigNumber } from '@ethersproject/bignumber';
import { ethers } from 'ethers';
import GaugeNames from '../../config/GaugeNames.json';
import { ADD_SNAPSHOT_BRIBE_MUTATION } from '@/helpers/mutations';
import {
  CURRENT_SNAPSHOT_BRIBES,
  PROPOSAL_REDUCED_QUERY
} from '@/helpers/queries';

const { getProvider } = useWeb3();

const client = new ApolloClient({
  uri: `${import.meta.env.VITE_API_ENDPOINT}/graphql`,
  cache: new InMemoryCache()
});

const snapshotClient = new ApolloClient({
  uri: `${import.meta.env.VITE_HUB_URL}/graphql`,
  cache: new InMemoryCache()
});

export async function getGaugeInfo(
  projectName,
  bribeAddress,
  gaugeAddress,
  gaugeController,
  index
) {
  try {
    const provider = await getProvider();
    const bribeContract = new ethers.Contract(
      bribeAddress,
      bribeV3.abi,
      provider
    );
    // eslint-disable-next-line prefer-const
    let [gaugeType, gaugeWeight, rewards] = await Promise.all([
      gaugeController.gauge_types(gaugeAddress),
      gaugeController.get_gauge_weight(gaugeAddress),
      bribeContract.rewards_per_gauge(gaugeAddress)
    ]);

    console.log(gaugeType.toString());

    gaugeWeight = parseFloat(ethers.utils.formatUnits(gaugeWeight, 18));

    //calculate total dollar amounts
    const period = getActivePeriod();
    let totalRewards = 0;
    for (let i = 0; i < rewards.length; i++) {
      const token = new ethers.Contract(rewards[i], erc20.abi, provider);
      const decimals = BigNumber.from(await token.decimals()).toNumber();
      const rawBribeAmount = ethers.utils.formatUnits(
        await bribeContract._reward_per_gauge(period, gaugeAddress, rewards[i]),
        decimals
      );
      // include fee in amount
      const bribeAmount = (parseFloat(rawBribeAmount) / 95) * 100;
      console.log(rewards[i], bribeAmount);
      const { price } = await tokenPriceLogo(rewards[i]);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const dollarAmount = bribeAmount * price;
      totalRewards += dollarAmount;
    }

    const dollarsPerVote = gaugeWeight > 0 ? totalRewards / gaugeWeight : 0;

    let name = 'Unknown';
    let tokenAddress = '';

    if (['0', '5', '6'].includes(gaugeType.toString())) {
      switch (projectName) {
        case 'FRAX': {
          try {
            name = await getContractName(gaugeAddress);
          } catch (e) {
            console.log(e);
          }
          break;
        }
        case 'ANGLE': {
          const gaugeContract = new ethers.Contract(
            gaugeAddress,
            angleGauge.abi,
            provider
          );
          tokenAddress = await gaugeContract.staking_token();
          const lpToken = new ethers.Contract(
            tokenAddress,
            erc20.abi,
            provider
          );
          name = await lpToken.name();
          break;
        }
        default: {
          const gaugeContract = new ethers.Contract(
            gaugeAddress,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            gauge.abi,
            provider
          );
          tokenAddress = await gaugeContract.lp_token();
          const lpToken = new ethers.Contract(
            tokenAddress,
            erc20.abi,
            provider
          );
          name = await lpToken.name();
          break;
        }
      }
    }

    if (name === 'Unknown') {
      //get gauge name from config file
      const item = GaugeNames.find(({ address }) => address === gaugeAddress);
      if (item) {
        name = item.name;
      }
    }

    return {
      gaugeName: name,
      gaugeWeight: gaugeWeight,
      totalRewards,
      dollarsPerVote,
      gaugeType
    };
  } catch (ex) {
    console.log('------------------------------------');
    console.log(
      `exception thrown in getGaugeInfo(${gaugeController}, ${index})`
    );
    console.log(ex);
    console.log('------------------------------------');
    return null;
  }
}

export function getActivePeriod() {
  const WEEK = BigNumber.from(86400).mul(7);
  const date = Math.floor(new Date().getTime() / 1000);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return Math.floor(date / WEEK) * WEEK;
}

export async function tokenPriceLogo(token) {
  const url = `https://api.coingecko.com/api/v3/coins/ethereum/contract/${token}`;

  const response = await fetch(url);
  const body = await response.json();
  const data = {
    price: body.market_data ? body.market_data.current_price.usd : 0,
    logo: body.image ? body.image.large : null
  };
  return data;
}

export async function addRewardAmount(
  bribeAddress,
  gaugeAddress,
  bribeAmount,
  bribeToken
) {
  const provider = await getProvider();
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const signer = provider.getSigner();
  const token = new ethers.Contract(bribeToken, erc20.abi, signer);
  const decimals = await token.decimals();
  const amount = ethers.utils.parseUnits(bribeAmount.toString(), decimals);

  const bribeContract = new ethers.Contract(bribeAddress, bribeV3.abi, signer);
  const tx = await bribeContract.add_reward_amount(
    gaugeAddress,
    bribeToken,
    amount
  );
  console.log(tx);
}

export async function addSnapshotRewardAmount(
  space,
  proposal,
  option,
  bribeAmount,
  bribeToken,
  start,
  end
) {
  const provider = await getProvider();
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const signer = provider.getSigner();
  const token = new ethers.Contract(bribeToken, erc20.abi, signer);
  const decimals = await token.decimals();
  const amount = ethers.utils.parseUnits(bribeAmount.toString(), decimals);
  const bribeAddress = import.meta.env.VITE_BRIBE_SNAPSHOT_ADDRESS;

  const bribeContract = new ethers.Contract(
    bribeAddress,
    bribeV3Snapshot.abi,
    signer
  );
  const tx = await bribeContract.add_reward_amount(
    proposal,
    option,
    bribeToken,
    amount
  );
  console.log(tx);

  // add bribe to the db for easier querying later
  const request = await client.mutate({
    mutation: ADD_SNAPSHOT_BRIBE_MUTATION,
    variables: {
      tx: tx.hash,
      space,
      proposal,
      option,
      token: bribeToken,
      amount: parseFloat(bribeAmount),
      start,
      end
    }
  });
  console.log(request);
}

export async function getAllowance(tokenAddress, bribeAddress) {
  console.log(tokenAddress);
  const provider = await getProvider();
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const signer = provider.getSigner();
  const token = new ethers.Contract(tokenAddress, erc20.abi, signer);
  const allowance = await token.allowance(
    await signer.getAddress(),
    bribeAddress.toString()
  );
  return ethers.utils.formatEther(allowance);
}

export async function approveToken(tokenAddress, bribeAddress) {
  try {
    const provider = await getProvider();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const signer = provider.getSigner();
    const token = new ethers.Contract(tokenAddress, erc20.abi, signer);

    const approveTx = await token.approve(
      bribeAddress,
      ethers.constants.MaxInt256
    );
    console.log(approveTx);
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

export async function getActiveSnapshotBribes() {
  const activeSnapshotBribes = [];
  try {
    const { data } = await client.query({
      query: CURRENT_SNAPSHOT_BRIBES
    });
    const { snapshotBribes } = data;

    for (let i = 0; i < snapshotBribes.length; i++) {
      // get proposal info
      const proposalData = await snapshotClient.query({
        query: PROPOSAL_REDUCED_QUERY,
        variables: { id: snapshotBribes[i].proposal }
      });
      const { proposal } = proposalData.data;

      // get token info
      const { price, logo } = await tokenPriceLogo(snapshotBribes[i].token);
      const tokenInfo = await getTokenInfo(snapshotBribes[i].token);
      const tokenData = { price, logo, symbol: tokenInfo.symbol };
      activeSnapshotBribes.push({
        ...snapshotBribes[i],
        ...proposal,
        ...tokenData
      });
    }
  } catch (e) {
    console.log(e);
  }

  return activeSnapshotBribes;
}

export async function getBribesForProposal(proposal, choices) {
  const bribedChoices = [];
  try {
    const provider = await getProvider();
    const bribeAddress = import.meta.env.VITE_BRIBE_SNAPSHOT_ADDRESS;
    const bribeContract = new ethers.Contract(
      bribeAddress,
      bribeV3Snapshot.abi,
      provider
    );

    const bribes = await bribeContract.rewards_per_proposal(proposal);

    console.log(bribes, choices);

    for (let i = 0; i < bribes.length; i++) {
      const { amount, option, token } = bribes[i];
      const tokenContract = new ethers.Contract(token, erc20.abi, provider);
      const [decimals, symbol] = await Promise.all([
        tokenContract.decimals(),
        tokenContract.symbol()
      ]);
      const formattedAmount = parseFloat(
        ethers.utils.formatUnits(amount, decimals)
      );
      bribedChoices.push({
        // include fee in amount
        amount: (formattedAmount / 95) * 100,
        symbol,
        option: choices[parseInt(option) - 1]
      });
    }

    console.log(bribedChoices);
    return bribedChoices;
  } catch (e) {
    console.log(e);
    return bribedChoices;
  }
}
