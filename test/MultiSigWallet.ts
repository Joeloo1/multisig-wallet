import { ethers } from "hardhat";
import { expect } from "chai";
import { MultiSigWallet } from "../typechain-types";
import { Signer, Wallet } from "ethers";

describe("MultiSigWallet", function () {
  let multiSigWallet: MultiSigWallet;
  let owner1: Signer;
  let owner2: Signer;
  let owner3: Signer;
  let nonOwner: Signer;

  beforeEach(async function () {
    [owner1, owner2, owner3, nonOwner] = await ethers.getSigners();

    const MultiSigWalletFactory =
      await ethers.getContractFactory("MultiSigWallet");

    multiSigWallet = (await MultiSigWalletFactory.deploy(
      [
        await owner1.getAddress(),
        await owner2.getAddress(),
        await owner3.getAddress(),
        await nonOwner.getAddress(),
      ],
      2,
    )) as MultiSigWallet;
  });

  describe("Deployment", () => {
    it("should set the correct owners", async () => {
      expect(await multiSigWallet.owners(0)).to.equal(
        await owner1.getAddress(),
      );
      expect(await multiSigWallet.owners(1)).to.equal(
        await owner2.getAddress(),
      );
      expect(await multiSigWallet.owners(2)).to.equal(
        await owner3.getAddress(),
      );
      expect(await multiSigWallet.owners(3)).to.equal(
        await nonOwner.getAddress(),
      );
    });
  });

  it("should mark each address as an owner", async () => {
    expect(await multiSigWallet.isOwner(await owner1.getAddress())).to.be.true;
    expect(await multiSigWallet.isOwner(await owner2.getAddress())).to.be.true;
    expect(await multiSigWallet.isOwner(await owner3.getAddress())).to.be.true;
    expect(await multiSigWallet.isOwner(await nonOwner.getAddress())).to.be
      .true;
  });

  it("should set numConfirmationsRequired correctly", async () => {
    expect(await multiSigWallet.numConfirmationsRequired()).to.equal(2);
  });

  it("should revert if no owners are passed", async () => {
    const MultiSigWalletFactory =
      await ethers.getContractFactory("MultiSigWallet");

    await expect(MultiSigWalletFactory.deploy([], 1)).to.be.revertedWith(
      "Owners Required",
    );
  });

  it("should revert if confirmations required is 0", async () => {
    const MultiSigWalletFactory =
      await ethers.getContractFactory("MultiSigWallet");

    await expect(
      MultiSigWalletFactory.deploy(
        [await owner1.getAddress(), await owner2.getAddress()],
        0,
      ),
    ).to.be.revertedWith("Invalid required number of owners");
  });

  it("should revert if confirmations required exceeds owners count", async () => {
    const MultiSigWalletFactory =
      await ethers.getContractFactory("MultiSigWallet");

    await expect(
      MultiSigWalletFactory.deploy(
        [await owner1.getAddress(), await owner2.getAddress()],
        3,
      ),
    ).to.be.revertedWith("Invalid required number of owners");
  });

  it("should revert if a duplicate owner is passed", async () => {
    const MultiSigWalleTFactory =
      await ethers.getContractFactory("MultiSigWallet");

    await expect(
      MultiSigWalleTFactory.deploy(
        [
          await owner1.getAddress(),
          await owner1.getAddress(),
          await owner2.getAddress(),
        ],
        2,
      ),
    ).to.be.revertedWith("Owner is not unique");
  });

  it("should revert if address(0) is passed as an owner", async () => {
    const MultiSigWalletFactory =
      await ethers.getContractFactory("MultiSigWallet");

    await expect(
      MultiSigWalletFactory.deploy(
        [await owner1.getAddress(), ethers.ZeroAddress],
        1,
      ),
    ).to.be.revertedWith("Invalid Owner");
  });

  describe("Deposit", () => {
    it("should accept ETH and emit Deposit event", async () => {
      const amount = ethers.parseEther("2");

      await expect(
        owner1.sendTransaction({
          to: await multiSigWallet.getAddress(),
          value: amount,
        }),
      )
        .to.emit(multiSigWallet, "Deposit")
        .withArgs(await owner1.getAddress(), amount);
    });
  });

  it("should increase the contract balance on deposit", async () => {
    const amount = ethers.parseEther("3");

    await owner1.sendTransaction({
      to: await multiSigWallet.getAddress(),
      value: amount,
    });

    const balance = await ethers.provider.getBalance(
      await multiSigWallet.getAddress(),
    );
    expect(balance).to.equal(amount);
  });

  describe("Submit", async () => {
    it("should allow an owner to submit a transaction", async () => {
      await expect(
        multiSigWallet
          .connect(owner1)
          .submit(await owner2.getAddress(), ethers.parseEther("1"), "0x"),
      )
        .to.emit(multiSigWallet, "Submit")
        .withArgs(
          0,
          await owner1.getAddress(),
          await owner2.getAddress(),
          ethers.parseEther("1"),
          "0x",
        );
    });

    it("Should store the transaction correctly", async () => {
      await multiSigWallet
        .connect(owner1)
        .submit(await owner2.getAddress(), ethers.parseEther("1"), "0x");

      const tx = await multiSigWallet.transactions(0);
      expect(tx.to).to.equal(await owner2.getAddress());
      expect(tx.value).to.equal(ethers.parseEther("1"));
      expect(tx.executed).to.be.false;
    });
  });

  describe("Approve", () => {
    beforeEach(async () => {
      await multiSigWallet
        .connect(owner1)
        .submit(await owner2.getAddress(), ethers.parseEther("1"), "0x");
    });

    it("Should allow an owner to approve a transaction", async () => {
      await expect(multiSigWallet.connect(owner1).approve(0))
        .to.emit(multiSigWallet, "Approve")
        .withArgs(await owner1.getAddress(), 0);

      expect(await multiSigWallet.approved(0, await owner1.getAddress())).to.be
        .true;
    });

    it("Should revert if tx does not exist", async () => {
      await expect(
        multiSigWallet.connect(owner1).approve(99),
      ).to.be.revertedWith("Tx does not exist");
    });

    it("Should revert if owner tries to approve the same tx twice", async () => {
      await multiSigWallet.connect(owner1).approve(0);
      await expect(
        multiSigWallet.connect(owner1).approve(0),
      ).to.be.revertedWith("tx already approved");
    });
  });

  describe("Execute", () => {
    const SEND_AMOUNT = ethers.parseEther("1");

    beforeEach(async () => {
      await owner1.sendTransaction({
        to: await multiSigWallet.getAddress(),
        value: ethers.parseEther("5"),
      });

      await multiSigWallet
        .connect(owner1)
        .submit(await nonOwner.getAddress(), SEND_AMOUNT, "0x");
    });

    it("Should execute after enough approvals", async () => {
      await multiSigWallet.connect(owner1).approve(0);
      await multiSigWallet.connect(owner2).approve(0);

      const balanceBefore = await ethers.provider.getBalance(
        await nonOwner.getAddress(),
      );

      await expect(multiSigWallet.connect(owner1).execute(0))
        .to.emit(multiSigWallet, "Execute")
        .withArgs(0, await nonOwner.getAddress(), SEND_AMOUNT, true);

      const balanceAfter = await ethers.provider.getBalance(
        await nonOwner.getAddress(),
      );
      expect(balanceAfter - balanceBefore).to.equal(SEND_AMOUNT);
    });

    it("Should mark transaction as executed", async () => {
      await multiSigWallet.connect(owner1).approve(0);
      await multiSigWallet.connect(owner2).approve(0);
      await multiSigWallet.connect(owner1).execute(0);

      const tx = await multiSigWallet.transactions(0);
      expect(tx.executed).to.be.true;
    });

    it("Should revert if not enough approvals", async () => {
      await multiSigWallet.connect(owner1).approve(0);
      await expect(
        multiSigWallet.connect(owner1).execute(0),
      ).to.be.revertedWith("Not enough confirmations");
    });

    it("Should revert if already executed", async () => {
      await multiSigWallet.connect(owner1).approve(0);
      await multiSigWallet.connect(owner2).approve(0);
      await multiSigWallet.connect(owner1).execute(0);

      await expect(
        multiSigWallet.connect(owner1).execute(0),
      ).to.be.revertedWith("tx already executed");
    });

    it("Should revert if tx does not exist", async () => {
      await expect(
        multiSigWallet.connect(owner1).execute(99),
      ).to.be.revertedWith("Tx does not exist");
    });
  });

  describe("Revoke", () => {
    beforeEach(async () => {
      await multiSigWallet
        .connect(owner1)
        .submit(await owner2.getAddress(), ethers.parseEther("1"), "0x");
      await multiSigWallet.connect(owner1).approve(0);
    });

    it("Should allow an owner to revoke their approval", async () => {
      await expect(multiSigWallet.connect(owner1).revoke(0))
        .to.emit(multiSigWallet, "Revoke")
        .withArgs(await owner1.getAddress(), 0);

      expect(await multiSigWallet.approved(0, await owner1.getAddress())).to.be
        .false;
    });

    it("Should revert if owner has not approved the tx", async () => {
      await expect(multiSigWallet.connect(owner2).revoke(0)).to.be.revertedWith(
        "Tx not approved",
      );
    });

    it("Should revert if tx does not exist", async () => {
      await expect(
        multiSigWallet.connect(owner1).revoke(99),
      ).to.be.revertedWith("Tx does not exist");
    });

    it("Should prevent execution after revoking below threshold", async () => {
      await owner1.sendTransaction({
        to: await multiSigWallet.getAddress(),
        value: ethers.parseEther("5"),
      });

      await multiSigWallet.connect(owner2).approve(0);
      await multiSigWallet.connect(owner1).revoke(0);

      await expect(
        multiSigWallet.connect(owner1).execute(0),
      ).to.be.revertedWith("Not enough confirmations");
    });
  });
});
