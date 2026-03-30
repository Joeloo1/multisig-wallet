# MultiSigWallet

A secure and decentralized multi-signature wallet implemented in Solidity. This contract allows multiple owners to manage shared funds by requiring a minimum number of confirmations before any transaction can be executed.

## Features

- **Multiple Owners**: Securely managed by a predefined list of authorized addresses.
- **Ether Deposits**: The wallet can receive Ether from anyone.
- **Transaction Proposals**: Owners can submit new transaction proposals.
- **Confirmation Mechanism**: Transactions require a minimum number of owner approvals (configurable at deployment) to be executed.
- **Revocable Approvals**: Owners can revoke their approval before a transaction is executed.
- **Anyone Can Execute**: Once the required number of confirmations is met, anyone can trigger the execution.

## Contract Architecture

### Core Components

- **`Transaction` Struct**:
  - `to`: Destination address for the transaction.
  - `value`: Amount of Ether to be sent.
  - `data`: Calldata for the transaction.
  - `executed`: Boolean flag to track the transaction's status.

- **State Variables**:
  - `owners`: A list of all wallet owners.
  - `isOwner`: A mapping for quick lookup of owner status.
  - `numConfirmationsRequired`: The threshold of approvals needed for execution.
  - `transactions`: An array of all submitted transaction proposals.
  - `approved`: A mapping of transaction IDs to owner approval status.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+ recommended)
- [pnpm](https://pnpm.io/) or [npm](https://www.npmjs.com/)

### Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    pnpm install
    ```

### Compilation

Compile the Solidity smart contract using Hardhat:
```bash
pnpm run compile
```

### Testing

Run the automated test suite to verify contract functionality:
```bash
pnpm run test
```

## Usage Guide

### Deployment

When deploying the `MultiSigWallet` contract, the constructor requires:
1.  `_owners`: An array of unique addresses that will manage the wallet.
2.  `_numConfirmationsRequired`: The number of approvals (at least 1 and no more than the number of owners) required for a transaction to execute.

### Interacting with the Wallet

- **Submit**: Owners call `submit(address _to, uint _value, bytes calldata _data)` to propose a new transaction.
- **Approve**: Owners call `approve(uint _txId)` to confirm a specific transaction proposal.
- **Revoke**: Owners call `revoke(uint _txId)` to withdraw their previous approval.
- **Execute**: Anyone calls `execute(uint _txId)` to finalize a transaction once it has reached the required threshold of confirmations.

## License

This project is licensed under the [ISC License](LICENSE).
