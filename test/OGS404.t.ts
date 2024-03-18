import { expect } from "chai"
import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers"
import { ethers, network } from "hardhat"
import "dotenv/config"
import { BaseContract, Block, EventLog } from "ethers"
import { JoePair } from "../typechain-types"
import { ogs404 } from "../typechain-types/contracts"

describe("OGS404", function () {
  async function deployWAVAX() {
    const factory = await ethers.getContractFactory("WAVAX")

    const contract = await factory.deploy()
    await contract.waitForDeployment()

    return contract
  }

  async function deployTJRouter( factoryAddress: string, wavaxAddress: string ) {
    const factory = await ethers.getContractFactory("JoeRouter02")

    const contract = await factory.deploy(
      factoryAddress,
      wavaxAddress,
    )

    await contract.waitForDeployment()

    return contract
  }

  async function deployTJFactory() {
    const signers = await ethers.getSigners()
    const feeTo = signers[0]

    const factory = await ethers.getContractFactory("JoeFactory")

    const contract = await factory.deploy(
      feeTo.address,
    )

    await contract.waitForDeployment()

    return contract
  }

  async function deployOGS404() {
    const signers = await ethers.getSigners()

    const factory = await ethers.getContractFactory("OGS404")

    const wavax = await deployWAVAX()
    const joeFactory = await deployTJFactory()

    const wavaxAddress = await wavax.getAddress()
    const joeFactoryAddress = await joeFactory.getAddress()

    const joeRouter = await deployTJRouter( joeFactoryAddress, wavaxAddress )

    const joeRouterAddress = await joeRouter.getAddress()

    const owner = signers[0]
    const developer = signers[1]
    const founder = signers[2]
    const designer = signers[3]
    const team = signers[4]
    const treasury = signers[5]

    const ogUser = signers[6]
    const ogUser2 = signers[7]
    const whitelistUser = signers[8]
    const whitelistUser2 = signers[9]
    const publicUser = signers[10]
    const publicUser2 = signers[11]

    const ownerAddress = await owner.getAddress()
    const developerAddress = await developer.getAddress()
    const founderAddress = await founder.getAddress()
    const designerAddress = await designer.getAddress()
    const teamAddress = await team.getAddress()
    const treasuryAddress = await treasury.getAddress()

    await wavax.connect(owner).mint( ethers.parseUnits('380', 18) )

    const contract = await factory.deploy( 
      ownerAddress,
      joeRouterAddress,
      joeFactoryAddress,
      wavaxAddress,
      developerAddress,
      founderAddress,
      designerAddress,
      teamAddress,
      treasuryAddress
    )

    await contract.waitForDeployment()

    const contractAddress = await contract.getAddress()

    await contract.connect(owner).approve(joeRouterAddress, ethers.MaxUint256)
    await wavax.connect(owner).approve(joeRouterAddress, ethers.MaxUint256)

    await contract.connect(owner).approve(joeFactoryAddress, ethers.MaxUint256)
    await wavax.connect(owner).approve(joeFactoryAddress, ethers.MaxUint256)

    const createPairResponse = await joeFactory.createPair( wavaxAddress, contractAddress )
    //get the return value from the event
    const transaction = await createPairResponse?.wait()
    const logs = transaction?.logs

    let joePairAddress = ""
    let joePair : JoePair | null = null
    let joePairToken0 = ""
    let joePairToken1 = ""

    if (logs) {
      for (let i = 0; i < logs.length; i++) {
        const log = logs[i] as EventLog;

        if (log) {
          if (log.eventName === "PairCreated") {
            joePairAddress = log?.args?.pair
            
            if (joePairAddress) {
              joePair = await ethers.getContractAt("JoePair", joePairAddress) as JoePair

              joePairToken0 = await joePair.token0()
              joePairToken1 = await joePair.token1()

              let joePairFactory = await ethers.getContractFactory("JoePair")

              const bytecode = joePairFactory.bytecode
              const initCodeHash = ethers.keccak256(bytecode)

              console.log("JoePair initCodeHash: ", initCodeHash)
            }
          }
        }
      } 
    }

    return {
      contract,
      contractAddress,
      joeFactory,
      joeFactoryAddress,
      joeRouter,
      joeRouterAddress,
      wavax,
      wavaxAddress,
      joePair,
      joePairAddress,
      joePairToken0,
      joePairToken1,
      userWallets: {
        ogUser,
        ogUser2,
        whitelistUser,
        whitelistUser2,
        publicUser,
        publicUser2,
      },
      teamWallets: {
        owner,
        developer,
        founder,
        designer,
        team,
        treasury,
      }
    }
  }

  describe("#constructor", function () {
    it("Initializes the contract with the expected values", async function () {
      const f = await loadFixture(deployOGS404)

      expect(await f.contract.name()).to.equal('OGS404')
      expect(await f.contract.symbol()).to.equal('OGS404')
      expect(await f.contract.decimals()).to.equal(18)
      expect(await f.contract.owner()).to.equal(
        f.teamWallets.owner.address,
      )

      expect(await f.contract.PAIR_ADDRESS()).to.equal(f.joePairAddress)
    })
    it("Contract owner should have the right amount of tokens when deployed", async function () {
      const f = await loadFixture(deployOGS404)

      //the owner should have a balance of 380 OGS404 erc20 tokens
      expect(await f.contract.erc20BalanceOf(f.teamWallets.owner.address)).to.equal(
        ethers.parseUnits('380', 18),
      )
      //the owner should have 0 ERC721 tokens
      expect(await f.contract.erc721BalanceOf(f.teamWallets.owner.address)).to.equal(
        0,
      )
    })
    it("The contract owner should be able to add liquidity to the pair", async function () {
      const f = await loadFixture(deployOGS404)

      const liquidityAmount = ethers.parseUnits('380', 18)

      //get the current block
      const block = await network.provider.send("eth_getBlockByNumber", ["latest", false])
      const blockTimestamp = parseInt(block.timestamp)

      //check balance of joepair to see it is 0
      expect(await f.joePair?.balanceOf(f.teamWallets.owner.address)).to.equal(0)

      await f.joeRouter.connect(f.teamWallets.owner).addLiquidity(
        f.joePairToken0,
        f.joePairToken1,
        liquidityAmount,
        liquidityAmount,
        liquidityAmount - ethers.parseUnits('1', 17),
        liquidityAmount - ethers.parseUnits('1', 17),
        f.teamWallets.owner.address,
        blockTimestamp + 30000
      )

      const balance = await f.joePair?.balanceOf(f.teamWallets.owner.address)

      //The owner should now have a balance of liquidity tokens
      expect(balance).to.greaterThan(0)

      const reserves = await f.joePair?.getReserves()

      expect(reserves?._reserve0).to.be.equal(liquidityAmount)
      expect(reserves?._reserve1).to.be.equal(liquidityAmount)
    })
    it("LP pair should not contain ERC721 tokens", async function () {
      const f = await loadFixture(deployOGS404)

      const liquidityAmount = ethers.parseUnits('380', 18)

      //get the current block
      const block = await network.provider.send("eth_getBlockByNumber", ["latest", false])
      const blockTimestamp = parseInt(block.timestamp)

      await f.joeRouter.connect(f.teamWallets.owner).addLiquidity(
        f.joePairToken0,
        f.joePairToken1,
        liquidityAmount,
        liquidityAmount,
        liquidityAmount - ethers.parseUnits('1', 17),
        liquidityAmount - ethers.parseUnits('1', 17),
        f.teamWallets.owner.address,
        blockTimestamp + 30000
      )

      const erc721BalanceOfPair = await f.contract.erc721BalanceOf(f.joePairAddress)

      //The LP pair should not have any ERC721 tokens
      expect(erc721BalanceOfPair).to.equal(0)
    })
    it("transfer from lp pair should fail with trading still turned off", async function () {
      const f = await loadFixture(deployOGS404)

      const liquidityAmount = ethers.parseUnits('380', 18)

      //get the current block
      const block = await network.provider.send("eth_getBlockByNumber", ["latest", false])
      const blockTimestamp = parseInt(block.timestamp)

      await f.joeRouter.connect(f.teamWallets.owner).addLiquidity(
        f.joePairToken0,
        f.joePairToken1,
        liquidityAmount,
        liquidityAmount,
        liquidityAmount - ethers.parseUnits('1', 17),
        liquidityAmount - ethers.parseUnits('1', 17),
        f.teamWallets.owner.address,
        blockTimestamp + 30000
      )

      // mint some wavax to the public user
      await f.wavax.connect(f.userWallets.publicUser).mint( ethers.parseUnits('10', 18) )

      //approve the joe router to spend the wavax
      await f.wavax.connect(f.userWallets.publicUser).approve(f.joeRouterAddress, ethers.MaxUint256)

      //try to swap some wavax for ogs404
      await expect(
        f.joeRouter.connect(f.userWallets.publicUser).swapExactTokensForTokens(
          ethers.parseUnits('2', 18),
          ethers.parseUnits('1', 18),
          [f.wavaxAddress, f.contractAddress],
          f.userWallets.publicUser.address,
          blockTimestamp + 30000
        )
      ).to.be.revertedWith("Joe: TRANSFER_FAILED")
    })
    it("transfer from lp pair shouldn't fail with trading turned on", async function () {
      const f = await loadFixture(deployOGS404)

      const liquidityAmount = ethers.parseUnits('380', 18)

      //get the current block
      const block = await network.provider.send("eth_getBlockByNumber", ["latest", false])
      const blockTimestamp = parseInt(block.timestamp)

      await f.joeRouter.connect(f.teamWallets.owner).addLiquidity(
        f.joePairToken0,
        f.joePairToken1,
        liquidityAmount,
        liquidityAmount,
        liquidityAmount - ethers.parseUnits('1', 17),
        liquidityAmount - ethers.parseUnits('1', 17),
        f.teamWallets.owner.address,
        blockTimestamp + 30000
      )

      //turn on trading
      await f.contract.connect(f.teamWallets.owner).setERC20TradingActive()

      // mint some wavax to the public user
      await f.wavax.connect(f.userWallets.publicUser).mint( ethers.parseUnits('20', 18) )

      //approve the joe router to spend the wavax
      await f.wavax.connect(f.userWallets.publicUser).approve(f.joeRouterAddress, ethers.MaxUint256)

      //try to swap some wavax for ogs404
      await f.joeRouter.connect(f.userWallets.publicUser).swapExactTokensForTokens(
          ethers.parseUnits('2', 18),
          ethers.parseUnits('1', 18),
          [f.wavaxAddress, f.contractAddress],
          f.userWallets.publicUser.address,
          blockTimestamp + 30000
      )

      //transfer from the LP pair should now work
      expect( await f.contract.erc20BalanceOf(f.userWallets.publicUser) ).to.be.greaterThan(0)
      expect( await f.contract.erc721BalanceOf(f.userWallets.publicUser) ).to.be.greaterThan(0)
      
    })
    it("Buy tax should be applied once trading is turned on and 1 week has passed", async function () {
      const f = await loadFixture(deployOGS404)

      const liquidityAmount = ethers.parseUnits('380', 18)

      //get the current block
      let block = await network.provider.send("eth_getBlockByNumber", ["latest", false])
      let blockTimestamp = parseInt(block.timestamp)

      await f.joeRouter.connect(f.teamWallets.owner).addLiquidity(
        f.joePairToken0,
        f.joePairToken1,
        liquidityAmount,
        liquidityAmount,
        liquidityAmount - ethers.parseUnits('1', 17),
        liquidityAmount - ethers.parseUnits('1', 17),
        f.teamWallets.owner.address,
        blockTimestamp + 30000
      )

      //turn on trading
      await f.contract.connect(f.teamWallets.owner).setERC20TradingActive()

      // mint some wavax to the public user
      await f.wavax.connect(f.userWallets.publicUser).mint( ethers.parseUnits('20', 18) )

      //approve the joe router to spend the wavax
      await f.wavax.connect(f.userWallets.publicUser).approve(f.joeRouterAddress, ethers.MaxUint256)

      //move the block time forward by 7 days
      await time.increase(60 * 60 * 24 * 7)

      //get the current block after time increase
      block = await network.provider.send("eth_getBlockByNumber", ["latest", false])
      blockTimestamp = parseInt(block.timestamp)

      //get the balance of the ogs404 in the liquidity pool before we do the swap
      const ogs404BalanceOfPair = await f.contract.erc20BalanceOf(f.joePairAddress)

      //try to swap some wavax for ogs404
      await f.joeRouter.connect(f.userWallets.publicUser).swapExactTokensForTokens(
          ethers.parseUnits('2', 18),
          ethers.parseUnits('1', 18),
          [f.wavaxAddress, f.contractAddress],
          f.userWallets.publicUser.address,
          blockTimestamp + 30000
      )

      //get the balance of the ogs404 in the liquidity pool after we do the swap
      const ogs404BalanceOfPairAfter = await f.contract.erc20BalanceOf(f.joePairAddress)

      const totalTakeFromPair = ogs404BalanceOfPair - ogs404BalanceOfPairAfter

      //now get the user's balance of ogs404
      const userBalance = await f.contract.erc20BalanceOf(f.userWallets.publicUser.address)

      expect( totalTakeFromPair - userBalance ).to.be.greaterThan(0)
    })
    it("Sell tax should be applied once trading is turned on and 1 week has passed", async function () {
      const f = await loadFixture(deployOGS404)

      const liquidityAmount = ethers.parseUnits('380', 18)

      //get the current block
      let block = await network.provider.send("eth_getBlockByNumber", ["latest", false])
      let blockTimestamp = parseInt(block.timestamp)

      await f.joeRouter.connect(f.teamWallets.owner).addLiquidity(
        f.joePairToken0,
        f.joePairToken1,
        liquidityAmount,
        liquidityAmount,
        liquidityAmount - ethers.parseUnits('1', 17),
        liquidityAmount - ethers.parseUnits('1', 17),
        f.teamWallets.owner.address,
        blockTimestamp + 30000
      )

      //turn on trading
      await f.contract.connect(f.teamWallets.owner).setERC20TradingActive()

      // mint some wavax to the public user
      await f.wavax.connect(f.userWallets.publicUser).mint( ethers.parseUnits('20', 18) )

      //approve the joe router to spend the wavax
      await f.wavax.connect(f.userWallets.publicUser).approve(f.joeRouterAddress, ethers.MaxUint256)

      //move the block time forward by 7 days
      await time.increase(60 * 60 * 24 * 7)

      //get the current block after time increase
      block = await network.provider.send("eth_getBlockByNumber", ["latest", false])
      blockTimestamp = parseInt(block.timestamp)

      //get the balance of the ogs404 in the liquidity pool before we do the swap
      const ogs404BalanceOfPair = await f.contract.erc20BalanceOf(f.joePairAddress)

      //try to swap some wavax for ogs404
      await f.joeRouter.connect(f.userWallets.publicUser).swapExactTokensForTokens(
          ethers.parseUnits('2', 18),
          ethers.parseUnits('1', 18),
          [f.wavaxAddress, f.contractAddress],
          f.userWallets.publicUser.address,
          blockTimestamp + 30000
      )

      //get the balance of the ogs404 in the liquidity pool after we do the swap
      const ogs404BalanceOfPairAfter = await f.contract.erc20BalanceOf(f.joePairAddress)

      const totalTakeFromPair = ogs404BalanceOfPair - ogs404BalanceOfPairAfter

      //now get the user's balance of ogs404
      const userBalance = await f.contract.erc20BalanceOf(f.userWallets.publicUser.address)

      expect( totalTakeFromPair - userBalance ).to.be.greaterThan(0)

      //approve the joe router to spend the ogs404
      await f.contract.connect(f.userWallets.publicUser).approve(f.joeRouterAddress, ethers.MaxUint256)

      //get the balance of the ogs404 in the liquidity pool before we do the swap
      const ogs404BalanceOfPair2 = await f.contract.erc20BalanceOf(f.joePairAddress)

      console.log('user balance: ', userBalance)
      console.log('output', userBalance - ethers.parseUnits('5', 17))

      //try to swap some ogs404 for wavax
      await f.joeRouter.connect(f.userWallets.publicUser).swapExactTokensForTokensSupportingFeeOnTransferTokens(
          userBalance,
          userBalance - ethers.parseUnits('5', 17),
          [f.contractAddress, f.wavaxAddress],
          f.userWallets.publicUser.address,
          blockTimestamp + 30000
      )

      //get the balance of the ogs404 in the liquidity pool after we do the swap
      const ogs404BalanceOfPairAfter2 = await f.contract.erc20BalanceOf(f.joePairAddress)

      const totalSentToSellLP = ogs404BalanceOfPairAfter2 - ogs404BalanceOfPair2

      const totalTakenInTax = userBalance - totalSentToSellLP

      expect( totalTakenInTax ).to.be.greaterThan(0)
    })
    it("Owner should be able to change phase to OG minting phase", async function () {
      const f = await loadFixture(deployOGS404)

      await f.contract.connect(f.teamWallets.owner).setMintPhase(1)

      expect(await f.contract.mintPhase()).to.equal(1)
    })
    it( "If the mint is closed, minting shouldn't be possible", async function () {
      const f = await loadFixture(deployOGS404)

      const ogMintCost = await f.contract.OGS_MINT_PRICE()

      await expect(
        f.contract.connect(f.userWallets.ogUser).mint( 1, { value: ogMintCost } )
      ).to.be.revertedWith("OGS404: minting is closed")
    })
    it("Only OG should be able to mint in OG phase", async function () {
      const f = await loadFixture(deployOGS404)

      await f.contract.connect(f.teamWallets.owner).setOgAllowlist(f.userWallets.ogUser.address, true)
      await f.contract.connect(f.teamWallets.owner).setOgAllowlist(f.userWallets.ogUser2.address, true)

      await f.contract.connect(f.teamWallets.owner).setAllowlist(f.userWallets.whitelistUser.address, true)

      await f.contract.connect(f.teamWallets.owner).setMintPhase(1)

      const ogMintCost = await f.contract.OGS_MINT_PRICE()

      await f.contract.connect(f.userWallets.ogUser).mint( 1, { value: ogMintCost } )

      expect( await f.contract.erc721BalanceOf(f.userWallets.ogUser.address) ).to.equal(1)

      //mints from other users should fail
      await expect(
        f.contract.connect(f.userWallets.whitelistUser).mint( 1, { value: ogMintCost } )
      ).to.be.revertedWith("OGS404: sender not in OG allowlist")

      //mints from users not in any allowlist should fail
      await expect(
        f.contract.connect(f.userWallets.publicUser).mint( 1, { value: ogMintCost } )
      ).to.be.revertedWith("OGS404: sender not in OG allowlist")
    })
    it("Only allowlisted users should be able to mint in whitelist phase", async function () {
      const f = await loadFixture(deployOGS404)

      await f.contract.connect(f.teamWallets.owner).setOgAllowlist(f.userWallets.ogUser.address, true)

      await f.contract.connect(f.teamWallets.owner).setAllowlist(f.userWallets.whitelistUser.address, true)
      await f.contract.connect(f.teamWallets.owner).setAllowlist(f.userWallets.whitelistUser2.address, true)

      await f.contract.connect(f.teamWallets.owner).setMintPhase(2)

      const whitelistMintCost = await f.contract.ALLOWLIST_MINT_PRICE()
      const ogMintCost = await f.contract.OGS_MINT_PRICE()

      await f.contract.connect(f.userWallets.whitelistUser).mint( 1, { value: whitelistMintCost } )

      expect( await f.contract.erc721BalanceOf(f.userWallets.whitelistUser.address) ).to.equal(1)

      //mints from other users should fail
      await expect(
        f.contract.connect(f.userWallets.publicUser).mint( 1, { value: whitelistMintCost } )
      ).to.be.revertedWith("OGS404: sender not in allowlist")

      //mints from users not in any allowlist should fail
      await expect(
        f.contract.connect(f.userWallets.ogUser).mint( 1, { value: ogMintCost } )
      ).to.be.revertedWith("OGS404: sender not in allowlist")
    })
    it("All users should be able to mint in public phase", async function () {
      const f = await loadFixture(deployOGS404)

      await f.contract.connect(f.teamWallets.owner).setMintPhase(3)

      const publicMintCost = await f.contract.PUBLIC_MINT_PRICE()

      await f.contract.connect(f.userWallets.publicUser).mint( 1, { value: publicMintCost } )

      expect( await f.contract.erc721BalanceOf(f.userWallets.publicUser.address) ).to.equal(1)

      await f.contract.connect(f.userWallets.publicUser2).mint( 1, { value: publicMintCost } )

      expect( await f.contract.erc721BalanceOf(f.userWallets.publicUser2.address) ).to.equal(1)
    })
  })

})

