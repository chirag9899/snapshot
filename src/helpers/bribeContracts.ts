import angleGauge from '@/abi/angleGauge.json';
import bribeV3 from '@/abi/bribev3.json';
import erc20 from '@/abi/erc20.json';
import fraxGauge from '@/abi/fraxGauge.json';
import gauge from '@/abi/gauge.json';
import { getContractName } from '@/helpers/etherscan';
import { BigNumber } from '@ethersproject/bignumber';
import { ethers } from 'ethers';
import GaugeNames from '../../config/GaugeNames.json';

export async function getGaugeInfo(
  projectName,
  provider,
  signer,
  bribeAddress,
  gaugeAddress,
  gaugeController,
  index
) {
  try {
    const bribeContract = new ethers.Contract(
      bribeAddress,
      bribeV3.abi,
      signer
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
      const token = new ethers.Contract(rewards[i], erc20.abi, signer);
      const decimals = BigNumber.from(await token.decimals()).toNumber();
      console.log(decimals);
      const bribeAmount = ethers.utils.formatUnits(
        await bribeContract._reward_per_gauge(period, gaugeAddress, rewards[i]),
        decimals
      );
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
          const bytecode = await provider.getCode(gaugeAddress);
          const gaugeContract = new ethers.Contract(
            gaugeAddress,
            fraxGauge.abi,
            signer
          );
          try {
            name = await getContractName(gaugeAddress);
            console.log(name);
            // if (
            //   bytecode.includes(ethers.utils.id('stakingToken()').slice(2, 10))
            // ) {
            //   tokenAddress = await gaugeContract.stakingToken();
            //   const lpToken = new ethers.Contract(
            //     tokenAddress,
            //     erc20.abi,
            //     signer
            //   );
            //   name = await lpToken.name();
            // }
            // if (
            //   bytecode.includes(ethers.utils.id('uni_token0()').slice(2, 10))
            // ) {
            //   let token1 = await gaugeContract.uni_token0();
            //   let token2 = await gaugeContract.uni_token1();
            //   const token1Contract = new ethers.Contract(
            //     token1,
            //     erc20.abi,
            //     signer
            //   );
            //   const token2Contract = new ethers.Contract(
            //     token2,
            //     erc20.abi,
            //     signer
            //   );
            //   let token1Name = await token1Contract.name();
            //   let token2Name = await token2Contract.name();
            //   name = `${token1Name}/${token2Name}`;
            // }
            // if (bytecode.includes(ethers.utils.id('name()').slice(2, 10))) {
            //   name = await gaugeContract.name();
            // }
          } catch (e) {
            console.log(e);
          }
          break;
        }
        case 'ANGLE': {
          const gaugeContract = new ethers.Contract(
            gaugeAddress,
            angleGauge.abi,
            signer
          );
          tokenAddress = await gaugeContract.staking_token();
          const lpToken = new ethers.Contract(tokenAddress, erc20.abi, signer);
          name = await lpToken.name();
          break;
        }
        default: {
          const gaugeContract = new ethers.Contract(
            gaugeAddress,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            gauge.abi,
            signer
          );
          tokenAddress = await gaugeContract.lp_token();
          const lpToken = new ethers.Contract(tokenAddress, erc20.abi, signer);
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
      gaugeType: gaugeType
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
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const { ethereum } = window;
  if (ethereum) {
    const provider = new ethers.providers.Web3Provider(ethereum);
    const signer = provider.getSigner();

    const token = new ethers.Contract(bribeToken, erc20.abi, signer);
    const decimals = await token.decimals();
    const amount = ethers.utils.parseUnits(bribeAmount.toString(), decimals);

    const approveTx = await token.approve(bribeAddress, amount);
    console.log(approveTx);

    const bribeContract = new ethers.Contract(
      bribeAddress,
      bribeV3.abi,
      signer
    );
    const tx = await bribeContract.add_reward_amount(
      gaugeAddress,
      bribeToken,
      amount
    );
    console.log(tx);
  }
}
