# Raffle contract

- Mumbai Testnet Address:0x4838cF3eF6D79d625ffE3eDE73b843D99CF980Fd

**Setting up your Raffle Contract**

The Raffle creates raffle cycles with different IDs to incentivise donors to donate. At the end of each raffle cycle 4 given NFTs will be distributed between donors, the creator of the artwork and the organisation that created the raffle.

On deployment the currency address (USDC), and the Biconomy connection address has to be set within the constructor.

**function setDAOWalletAddress**
This is where the central DAO wallet address has to be set after deployment to ensure the flow of donations to this wallet address.

**function setNftAuthorWalletAddress**
Set the wallet address of the NFT contributor who you'd like to reward with a copy of the given NFT at the end of the raffle cycle.

**function setCuratorRole**
This contract also uses AccessControl(OpenZeppelin) that allows the creation of a DEFAULT_ADMIN_ROLE and a CURATOR_ROLE, this means that specific roles can trigger specific functions.
You can revoke a role via the _revokeCuratorRole_ function.

_Now your contract is ready to roll._

You can set up Raffles with given conditions using the **createRaffle** function.

**function turnOnTokenRewards**
Token rewards are optional,it is turned off by default.
If you would like to reward your donors with an ERC20-standard compatible reward token you can turn on the function by specifying the reward token address and the calculation formula address as well as the ID of the raffle you want to use the rewards for.
You also need to send the reward tokens to the raffle contract, you have to specify the amount of tokens you'd like to allocate for the raffle when you create it.

Your users can send their donations via the **donate** function, all donations flow to the previously set DAO Wallet.

At the end of the raffle you can reward your users with the NFTs and tokens with calling the **sendRewards** function.

**function cancelRaffle**
You can cancel a running raffle,this function ensures that users will get their donations back and the NFTs and allocated reward tokens will go back to the DAO Wallet too.

# ArtizenERC1155 contract

- Mumbai Testnet Address:
  0x64b141AA093cb409d5Dc1ccdcb7e4003d2A3B03e
