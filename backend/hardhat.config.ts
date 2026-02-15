import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./client/src/artifacts",
  },

  networks: {
    // Hardhat built-in network
    hardhat: {
      chainId: 1337,
    },

    // Localhost for Hardhat node
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
    },

    // Ganache default network (sometimes 1337)
    ganache1337: {
      url: "http://127.0.0.1:7545",
      chainId: 1337,
    },

    // Ganache default network (usually 5777)
    ganache5777: {
      url: "http://127.0.0.1:7545",
      chainId: 5777,
    },

    // Ganache (default)
    ganache: {
      url: "http://127.0.0.1:7545",
      chainId: 1337,
    },
  },
};

export default config;
