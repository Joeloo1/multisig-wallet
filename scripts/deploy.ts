import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Set the owners for your Multisig Wallet here:
  const owners = [
    deployer.address, // Include deployer by default, add others below
    "0xe7b730c3D99c479548F4FC848da4Ff071a63950d", // Account 3
    "0xE5CDAd753cab433AE696a6ED7F2666427A537ABE", // Account 4
  ];

  // Set required confirmations (e.g. 2 out of 3)
  const numConfirmationsRequired = 2;

  const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
  const multiSigWallet = await MultiSigWallet.deploy(
    owners,
    numConfirmationsRequired,
  );

  await multiSigWallet.waitForDeployment();

  console.log("MultiSigWallet deployed to:", await multiSigWallet.getAddress());
  console.log("Owners:", owners);
  console.log("Confirmations required:", numConfirmationsRequired);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
