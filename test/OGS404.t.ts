import { expect } from "chai"
import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers"
import { ethers, network } from "hardhat"
import "dotenv/config"
import { BaseContract } from "ethers"
import { JoeFactory, JoeRouter02 } from "../typechain-types"

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

    const joeRouter = await deployTJRouter( wavaxAddress, joeFactoryAddress )

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

    return {
      contract,
      contractAddress,
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
    })
  })

})

