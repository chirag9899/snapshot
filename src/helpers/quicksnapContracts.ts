import angleGauge from '@/abi/angleGauge.json';
import bribeV3 from '@/abi/bribev3.json';
import quicksnap from '@/abi/QuickSnap.json';
import erc20 from '@/abi/erc20.json';
import gauge from '@/abi/gauge.json';
import { getContractName } from '@/helpers/etherscan';
import { getTokenInfo } from '@/helpers/rewards';
import { ApolloClient, InMemoryCache } from '@apollo/client/core';
import { BigNumber } from '@ethersproject/bignumber';
import { ethers } from 'ethers';
import GaugeNames from '../../config/GaugeNames.json';
import { PROPOSAL_REDUCED_QUERY } from '@/helpers/queries';
import {
  CURRENT_SNAPSHOT_INCENTIVES,
  INCENTIVES_BY_PROPOSAL_QUERY
} from '@/helpers/graphQueries';
import { addIncentiveFee } from '@/helpers/utils';

const { getProvider, checkNetwork } = useWeb3();

const client = new ApolloClient({
  uri: `${import.meta.env.VITE_API_ENDPOINT}/graphql`,
  cache: new InMemoryCache()
});

const snapshotClient = new ApolloClient({
  uri: `${import.meta.env.VITE_HUB_URL}/graphql`,
  cache: new InMemoryCache()
});

const graphClient = new ApolloClient({
  uri: `${import.meta.env.VITE_GRAPH_ENDPOINT}`,
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
      const bribeAmount = addIncentiveFee(parseFloat(rawBribeAmount));
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
  checkNetwork();
  const url = `https://api.coingecko.com/api/v3/coins/ethereum/contract/${token}?x_cg_demo_api_key=${
    import.meta.env.VITE_COINGECKO_API_KEY
  }`;

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
  rewardAmount,
  rewardToken
) {
  const provider = await getProvider();
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const signer = provider.getSigner();
  const token = new ethers.Contract(rewardToken, erc20.abi, signer);
  const decimals = await token.decimals();
  const amount = ethers.utils.parseUnits(rewardAmount.toString(), decimals);

  const bribeContract = new ethers.Contract(bribeAddress, bribeV3.abi, signer);
  const tx = await bribeContract.add_reward_amount(
    gaugeAddress,
    rewardToken,
    amount
  );
  console.log(tx);
}

export async function addSnapshotRewardAmount(
  proposal,
  option,
  rewardAmount,
  rewardToken,
  start,
  end
) {
  checkNetwork();
  const provider = await getProvider();
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const signer = provider.getSigner();
  const token = new ethers.Contract(rewardToken, erc20.abi, signer);
  const decimals = await token.decimals();
  const amount = ethers.utils.parseUnits(rewardAmount.toString(), decimals);
  const quicksnapAddress = import.meta.env.VITE_QUICKSNAP_ADDRESS;

  const bribeContract = new ethers.Contract(
    quicksnapAddress,
    quicksnap.abi,
    signer
  );
  const tx = await bribeContract.add_reward_amount(
    proposal,
    option,
    rewardToken,
    amount,
    start,
    end
  );
  await tx.wait(1);
  console.log(tx);
}

export async function getAllowance(tokenAddress, quicksnapAddress) {
  checkNetwork();
  const provider = await getProvider();
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const signer = provider.getSigner();
  const token = new ethers.Contract(tokenAddress, erc20.abi, signer);
  const allowance = await token.allowance(
    await signer.getAddress(),
    quicksnapAddress.toString()
  );
  const decimals = await token.decimals();
  return ethers.utils.formatUnits(allowance, decimals);
}

export async function getTokenBalance(tokenAddress) {
  checkNetwork();
  const provider = await getProvider();
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const signer = provider.getSigner();
  const token = new ethers.Contract(tokenAddress, erc20.abi, signer);
  const allowance = await token.balanceOf(await signer.getAddress());
  const decimals = await token.decimals();
  return ethers.utils.formatUnits(allowance, decimals);
}

export async function isERC20(tokenAddress) {
  checkNetwork();
  try {
    const provider = await getProvider();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const signer = provider.getSigner();
    const token = new ethers.Contract(tokenAddress, erc20.abi, signer);

    const totalSupply = await token.callStatic.totalSupply();
    console.log(totalSupply);
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

export async function approveToken(tokenAddress, quicksnapAddress) {
  checkNetwork();
  try {
    const provider = await getProvider();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const signer = provider.getSigner();
    const token = new ethers.Contract(tokenAddress, erc20.abi, signer);

    const approveTx = await token.approve(
      quicksnapAddress,
      ethers.constants.MaxInt256
    );
    await approveTx.wait(1);
    console.log(approveTx);
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

export async function getActiveSnapshotIncentives() {
  const activeSnapshotIncentives = [];
  checkNetwork();
  try {
    const { data } = await graphClient.query({
      query: CURRENT_SNAPSHOT_INCENTIVES,
      variables: { time: Math.floor(Date.now() / 1000), skip: 0 }
    });
    const { rewardAddeds: rewards } = data;

    for (let i = 0; i < rewards.length; i++) {
      // get proposal info
      const proposalData = await snapshotClient.query({
        query: PROPOSAL_REDUCED_QUERY,
        variables: { id: rewards[i].proposal }
      });
      const { proposal } = proposalData.data;

      // get token info
      const { amount } = rewards[i];
      const { price, logo } = await tokenPriceLogo(rewards[i].reward_token);
      const tokenInfo = await getTokenInfo(rewards[i].reward_token);
      const tokenData = {
        price,
        logo,
        symbol: tokenInfo.symbol,
        decimals: tokenInfo.decimals
      };
      const formattedAmount = parseFloat(
        ethers.utils.formatUnits(amount, tokenInfo.decimals)
      );
      activeSnapshotIncentives.push({
        formattedAmount: addIncentiveFee(formattedAmount),
        ...rewards[i],
        ...proposal,
        ...tokenData
      });
    }
  } catch (e) {
    console.log(e);
  }

  return activeSnapshotIncentives;
}

export async function getIncentivesForProposal(proposal, choices) {
  checkNetwork();
  const incentivizedChoices = [];
  try {
    const provider = await getProvider();
    const { data } = await graphClient.query({
      query: INCENTIVES_BY_PROPOSAL_QUERY,
      variables: { id: proposal }
    });
    const { rewardAddeds: rewards } = data;

    console.log(rewards, choices);

    for (let i = 0; i < rewards.length; i++) {
      const { amount, option, reward_token: token } = rewards[i];
      const { price } = await tokenPriceLogo(token);

      const tokenContract = new ethers.Contract(token, erc20.abi, provider);
      const [decimals, symbol] = await Promise.all([
        tokenContract.decimals(),
        tokenContract.symbol()
      ]);
      const formattedAmount = parseFloat(
        ethers.utils.formatUnits(amount, decimals)
      );
      incentivizedChoices.push({
        // include fee in amount
        amount: addIncentiveFee(formattedAmount),
        dollarAmount: addIncentiveFee(formattedAmount * price),
        symbol,
        option: choices[parseInt(option) - 1]
      });
    }

    console.log(incentivizedChoices);
    return incentivizedChoices;
  } catch (e) {
    console.log(e);
    return incentivizedChoices;
  }
}
