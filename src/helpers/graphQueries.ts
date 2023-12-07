import gql from 'graphql-tag';

export const BRIBES_BY_PROPOSAL_QUERY = gql`
  query Bribes($id: String!) {
    bribes(where: { proposal: $id }) {
      id
      time
      briber
      proposal
      option
      reward_token
      amount
      startTime
      endTime
      blockNumber
      blockTimestamp
    }
  }
`;

export const CURRENT_SNAPSHOT_BRIBES = gql`
  query SnapshotBribes($time: Int!, $skip: Int!) {
    bribes(
      first: 1000
      skip: $skip
      where: { startTime_lte: $time, endTime_gte: $time }
    ) {
      id
      time
      briber
      proposal
      option
      reward_token
      amount
      startTime
      endTime
      blockNumber
      blockTimestamp
    }
  }
`;
