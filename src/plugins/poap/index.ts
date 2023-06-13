import { getProposalVotes } from '../../helpers/snapshot';

// URLS
const API_BASE_URL = 'https://api.poap.tech';
const APP_BASE_URL = 'https://app.poap.xyz';

export default class Plugin {
  public author = 'Poap-xyz';
  public version = '1.0.0';
  public name = 'POAP Module';
  public options: any;
  private static readonly POAP_API_API_KEY =
    'e68BJLYJ1ns9Mdb9hd21j8Ci1e6dVYsAddQfOVQp3oYHo9bqLCutMewQP8NhbVvguMdHiHefNat3eZWiFReeV9nr7QH4xAl67fYASKHhFfGbVKKzak11PV6NM1wYy2eP';

  openScanPage(address) {
    window.open(`${APP_BASE_URL}/scan/${address}`, '_blank');
  }
  async getCurrentState(snapshot, address) {
    // Fetch the event
    const eventResponse = await fetch(
      `${API_BASE_URL}/snapshot/proposal/${snapshot}`,
      { headers: { 'x-api-key': Plugin.POAP_API_API_KEY } }
    );
    // If the fetch fails: the event doesn't exists for this poap yet
    if (!eventResponse.ok) {
      return { image_url: '', currentState: 'NO_POAP' };
    }
    // Get the image from the event
    const { image_url } = await eventResponse.json();

    // Check that the address is not empty
    if (!address) {
      return { image_url, currentState: 'NOT_VOTED' };
    }

    // Fetch the vote
    const votes = await getProposalVotes(snapshot, { voter: address });
    const voted = votes.length > 0;
    if (!voted) {
      // Address did not vote proposal
      return { image_url, currentState: 'NOT_VOTED' };
    }

    // Fetch the claim info for the address
    const addressResponse = await fetch(
      `${API_BASE_URL}/snapshot/proposal/${snapshot}/${address}`,
      { headers: { 'x-api-key': Plugin.POAP_API_API_KEY } }
    );

    // If the fetch failed return the NOT_VOTED state
    if (!addressResponse.ok) {
      return { image_url, currentState: 'NOT_VOTED' };
    }
    const { claimed, status } = await addressResponse.json();

    if (claimed) {
      // If the address claimed the token but the status is not passed
      // it means that the token is being minted
      if (claimed && status !== 'passed') {
        return { image_url, currentState: 'LOADING' };
      }
      // If the status is passed: the token was claimed
      return { image_url, currentState: 'CLAIMED' };
    } else if (voted) {
      // The token is not claimed but the address voted
      return { image_url, currentState: 'UNCLAIMED' };
    }

    return { image_url, currentState: 'NOT_VOTED' };
  }
  async claim(snapshot, address) {
    const body = {
      snapshotProposalHash: snapshot,
      address: address
    };
    const response = await fetch(`${API_BASE_URL}/claim/snapshot-proposal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Plugin.POAP_API_API_KEY
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      // If the response is not ok: return the UNCLAIMED state
      console.log(response.json());
      return 'UNCLAIMED';
    }
    return 'LOADING';
  }
}
