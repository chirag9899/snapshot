import gql from 'graphql-tag';

export const ADD_SNAPSHOT_BRIBE_MUTATION = gql`
  mutation AddSnapshotBribe(
    $tx: String!
    $space: String!
    $proposal: String!
    $option: Int!
    $token: String!
    $amount: Float!
    $start: Int!
    $end: Int!
  ) {
    addSnapshotBribe(
      tx: $tx
      space: $space
      proposal: $proposal
      option: $option
      token: $token
      amount: $amount
      start: $start
      end: $end
    ) {
      success
    }
  }
`;
