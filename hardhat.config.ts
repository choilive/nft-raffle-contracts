import { task } from "hardhat/config";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "solidity-coverage";
import "@primitivefi/hardhat-dodoc";
import { HardhatUserConfig, NetworkUserConfig } from "hardhat/types";
import * as dotenv from "dotenv";

dotenv.config();
const isTestEnv = process.env.NODE_ENV === "test";

const netWorkConfig: NetworkUserConfig | undefined = isTestEnv
  ? ({
      rinkeby: {
        url: `https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMY_API}`,
        accounts: [`${process.env.RINKEBY_DEPLOYER_PRIV_KEY}`],
      },
      mainnet: {
        url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API}`,
        accounts: [`${process.env.MAINNET_DEPLOYER_PRIV_KEY}`],
      },
      kovan: {
        url: `https://eth-kovan.alchemyapi.io/v2/${process.env.ALCHEMY_API}`,
        accounts: [`${process.env.KOVAN_DEPLOYER_PRIV_KEY}`],
      },
      ropsten: {
        url: `https://eth-ropsten.alchemyapi.io/v2/${process.env.ALCHEMY_API}`,
        accounts: [`${process.env.ROPSTEN_DEPLOYER_PRIV_KEY}`],
      },
      goerli: {
        url: `https://eth-goerli.alchemyapi.io/v2/${process.env.ALCHEMY_API}`,
        accounts: [`${process.env.GOERLI_DEPLOYER_PRIV_KEY}`],
      },
      gnosis: {
        url: "https://rpc.gnosischain.com/",
        gasPrice: 1000000000,
        accounts: [`${process.env.GNOSIS_DEPLOYER_PRIV_KEY}`],
      },
      polygon: {
        url: `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API}`,
        accounts: [`${process.env.POLYGON_DEPLOYER_PRIV_KEY}`],
        chainId: 137,
      },
      mumbai: {
        url: `https://polygon-mumbai.g.alchemy.com/v2/${process.env.ALCHEMY_API}`,
        accounts: [`${process.env.MUMBAI_DEPLOYER_PRIV_KEY}`],
        chainId: 80001,
      },
      fantom: {
        url: `https://speedy-nodes-nyc.moralis.io/${process.env.MORALIS_API}/fantom/mainnet`,
        accounts: [`${process.env.FANTOM_DEPLOYER_PRIV_KEY}`],
        chainId: 250,
      },
      fantom_testnet: {
        url: "https://rpc.testnet.fantom.network",
        accounts: [`${process.env.FANTOM_TESTNET_DEPLOYER_PRIV_KEY}`],
        chainId: 4002,
      },
      optimism: {
        url: `https://opt-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API}`,
        accounts: [`${process.env.OPTIMISM_DEPLOYER_PRIV_KEY}`],
        chainId: 10,
      },
      optimism_kovan: {
        url: `https://opt-kovan.g.alchemy.com/v2/${process.env.ALCHEMY_API}`,
        accounts: [`${process.env.OPTIMISM_TEST_DEPLOYER_PRIV_KEY}`],
        chainId: 69,
      },
      arbitrum: {
        url: `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API}`,
        accounts: [`${process.env.ARBITRUM_DEPLOYER_PRIV_KEY}`],
        chainId: 42161,
      },
      arbitrum_rinkeby: {
        url: `https://arb-rinkeby.g.alchemy.com/v2/${process.env.ALCHEMY_API}`,
        accounts: [`${process.env.ARBITRUM_TEST_DEPLOYER_PRIV_KEY}`],
        chainId: 421611,
      },
      avalanche: {
        url: `https://speedy-nodes-nyc.moralis.io/${process.env.MORALIS_API}/avalanche/mainnet`,
        accounts: [`${process.env.AVALANCHE_DEPLOYER_PRIVATE_KEY}`],
        chainId: 43114,
      },
      fuji: {
        url: `https://speedy-nodes-nyc.moralis.io/${process.env.MORALIS_API}/avalanche/testnet`,
        accounts: [`${process.env.FUJI_DEPLOYER_PRIVATE_KEY}`],
        chainId: 43113,
      },
    } as NetworkUserConfig)
  : undefined;

const apiKeys = isTestEnv
  ? {
      mainnet: process.env.ETHERSCAN_API_KEY,
      rinkeby: process.env.ETHERSCAN_API_KEY,
      ropsten: process.env.ETHERSCAN_API_KEY,
      goerli: process.env.ETHERSCAN_API_KEY,
      kovan: process.env.ETHERSCAN_API_KEY,
      opera: process.env.FTMSCAN_API_KEY,
      ftmTestnet: process.env.FTMSCAN_API_KEY,
      polygon: process.env.POLYGONSCAN_API_KEY,
      polygonMumbai: process.env.POLYGONSCAN_API_KEY,
      optimisticEthereum: process.env.OPTIMISTIC_ETHERSCAN_API_KEY,
      optimisticKovan: process.env.OPTIMISTIC_ETHERSCAN_API_KEY,
      arbitrumOne: process.env.ARBISCAN_API_KEY,
      arbitrumTestnet: process.env.ARBISCAN_API_KEY,
      avalanche: process.env.SNOWTRACE_API_KEY,
      avalancheFujiTestnet: process.env.SNOWTRACE_API_KEY,
      xdai: process.env.BLOCKSCOUT_API_KEY,
    }
  : undefined;

const loadConfig = (): HardhatUserConfig => {
  const config = {
    defaultNetwork: "hardhat",
    solidity: {
      compilers: [
        {
          version: "0.8.9",
          settings: {
            optimizer: {
              enabled: true,
              runs: 1000,
            },
          },
        },
      ],
    },
    networks: {
      hardhat: {
        accounts: {
          accountsBalance: "1000000000000000000000000",
        },
      },
      localhost: {
        url: "http://localhost:8545",
        /*
          notice no env vars here? it will just use account 0 of the hardhat node to deploy
          (you can put in a mnemonic here to set the deployer locally)
        */
      },
    },
    etherscan: {
      apiKey: apiKeys,
    },
    dodoc: {
      exclude: [
        "Address",
        "console",
        "Context",
        "Counters",
        "ECDSA",
        "EIP712",
        "ERC20",
        "ERC20Permit",
        "ERC165",
        "ERC165Storage",
        "ERC721",
        "ERC1155",
        "IERC20",
        "IERC20Metadata",
        "IERC20Permit",
        "IERC20Receiver",
        "IERC721",
        "IERC721Metadata",
        "IERC721Receiver",
        "IERC165",
        "IERC1155",
        "IERC1155MetadataURI",
        "IERC1155Receiver",
        "IERC1271",
        "INFT",
        "Ownable",
        "ReentrancyGuard",
        "SafeERC20",
        "SignatureChecker",
        "Strings",
        "TestUser",
      ],
    },
    // mocha options can be set here
    mocha: {
      // timeout: "300s",
    },
    // typechain: {
    //   outDir: 'src/types',
    //   target: 'ethers-v5',
    //   alwaysGenerateOverloads: false, // should overloads with full signatures like deposit(uint256) be generated always, even if there are no overloads?
    //   externalArtifacts: ['externalArtifacts/*.json'], // optional array of glob patterns with external artifacts to process (for example external libs from node_modules)
    // },
  };
  if (isTestEnv) {
    return config;
  } else {
    return {
      ...config,
      ...apiKeys,
      ...netWorkConfig,
    };
  }
};

const config = loadConfig();

export default config;
