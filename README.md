# Cross-DAO-Vote
This project is mainly for Polygon screening test purpose.
Main objective of this voting contract is for **handling proposals, votes, and token claims across multiple DAO contracts** in the same chain network (EVM-compatible only). This voting contract is only meant for ERC-1155 token usage.

# Factory contract
DAOToken.sol implements ERC-1155 standard and used for minting token that will be used for proposal creation and vote purposes.
This contract implements EIP-2612 for verifying signature using Permit function.

# Voting contract
DAOVote.sol is the main contract for handling proposals, votes, and token claims.
Proposer need to specify which DAO contract and token ID will be used for the proposal creation.
Proposer can specify multiple DAO contracts that can perform voting on the particular proposal.
Those DAO token contract must implement EIP-2612 for verifying signature on chain using Permit function.
This list of DAO contract addresses merkle tree will be computed off-chain and will be saved on-chain as hashed merkle root.
In order to perform voting, voter must hold any token of the allowed DAO contract addresses.
Each proposal creation and casted vote will transfer one(1) token of the specified token ID to a custodial 'Account' contract.

# Custodial contract
Account.sol contract hold tokens that has been used after proposal creation or vote casted.
This 'Account' contract will be automatically created for each first time proposer or voter.
User will be able to claim their used token held by this contract after voting period ends or after proposer cancel the proposal.

# Development notes
This DAO voting contract implements EIP-2612 that uses Permit function that verify signature for ERC-1155 token approval handling. 
This gasless transaction will remove hassle of approving token first before transferring it to another address.
There are also other **multiple best practices smart contract development patterns and methods** that you can discover in the codes.
* Transparent upgradeable proxy contract
* Factory pattern
* Merkle tree pattern
* Check-effect-interactions pattern
* Pull-over-push pattern
* Modifier as access restrictions

**Development room of improvements**
* Remove token 'value' parameter for verifying signature for the Permit function as this token value are not utilized during ERC-1155 standard token approval function call 'setApprovalForAll'.
* Allow voter to specify how many token(s) to be used for voting instead of restrict it to one(1).
* Allow proposer to specify combination of DAO contract addresses with respectives token ID that are allowed to cast a vote.
