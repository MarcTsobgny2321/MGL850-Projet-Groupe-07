import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    // Cancun : nécessaire pour OpenZeppelin 5.6 (instruction mcopy)
    settings: { evmVersion: "cancun" },
  },
};

export default config;
