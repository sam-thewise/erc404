import "dotenv/config"
import { HardhatUserConfig } from "hardhat/config"
import "@nomicfoundation/hardhat-toolbox"
import "hardhat-gas-reporter"
import { ethers } from "ethers"

const config: HardhatUserConfig = {
  solidity: { 
    compilers: [
      { 
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 300,
          },
        }
      }, 
      { 
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 300,
          },
        }
      }, 
      { 
        version: "0.4.18",
        settings: {
          optimizer: {
            enabled: true,
            runs: 300,
          },
        }
      }
    ],
  },
  gasReporter: {
    currency: "USD",
    gasPrice: 21,
    enabled: true,
  },
  networks: {
    hardhat: {
      accounts: {
        count: 300
      },
    },
    fuji: {
      url: process.env.FUJI_URL,
      accounts: [process.env.PRIVATE_KEY ?? ""],
      gasPrice: parseInt(ethers.parseUnits("25", "gwei").toString()),
    },
    // mumbai: {
    //   url: process.env.MUMBAI_URL,
    //   accounts: [process.env.PRIVATE_KEY ?? ""],
    //   gasPrice: parseInt(ethers.parseUnits("20", "wei").toString()),
    // },
  },
  etherscan: {
    apiKey: {
      fuji: process.env.ETHERSCAN_FUJI_API_KEY ?? "",
      mumbai: process.env.ETHERSCAN_MUMBAI_API_KEY ?? "",
    },
    customChains: [
      {
        network: "fuji",
        chainId: 43113,
        urls: {
          apiURL: "https://api-testnet.snowtrace.io/api",
          browserURL: "https://testnet.snowtrace.io/",
        },
      },
      // {
      //   network: "mumbai",
      //   chainId: 80001,
      //   urls: {
      //     apiURL: "https://mumbai.polygonscan.com/api",
      //     browserURL: "https://mumbai.polygonscan.com/",
      //   },
      // },
    ],
  },
}

export default config
