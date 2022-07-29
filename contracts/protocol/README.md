# Artizen Protocol Central Wrapper

This is the main element of the Protocol.

**function createOrganization**

- Organisations register themselves here

**function addTreasuryModule & function addRaffleModule**

- Organisations create and deploy Treasury and Raffle modules from this contract
- The treasury module has to be the first to be created and deployed

**function setProtocolFee & function setProtocolWalletAddress**

- Protocol fee and protocol wallet address is set here centrally

**function setTokenRewardsCalculationAddress**

- Token rewards mathematical calculation contract address is set here centrally

# Treasury Module

The treasury module has to be created before the Raffle module since the treasury is accounting for all incoming donations and handling fees.It also has optional Aave integration, you can deposit funds to Aave and earn yield on it.

**function processDonationFromRaffle**

- processes all incoming donations to the treasury and pays fees

**function withdrawFundsToOrganisationWallet**

- withdraws funds to organisation wallet address that was set in the wrapper contract centrally

**function depositToAave**

- deposits the given amount to Aave

**function withdrawFromAave**

-withdraws given amount from Aave moves it back to treasury

**function claimAaveRewards**

- claims rewards earned on Aave deposit

**function getTotalDonationsPerRaffle**

- returns the total donation from a raffle from a specific Raffle module address

**function getUSDCInAave**

- returns the amount deposited into Aave

**function getUSDCFromTreasury**

- returns USDC balance in Treasury module

# Raffle Module

The Raffle creates raffle cycles with different IDs to incentivise donors to donate.
End of each raffle cycle 4 given NFTs will be distributed to:

- donors
- creator of the artwork
- organisation that created the raffle.
  ​
  The Raffle also has optional tokenRewards and optional Limited NFT edition rewards.

* On deployment the currency address (USDC) & Biconomy connection address has to be set within constructor.

  ​
  **function setDAOWalletAddress**
  ​

* Where central DAO wallet address has to be set after deployment to ensure the flow of donations to this wallet address.

  ​
  **function setNftAuthorWalletAddress**
  ​

* Set wallet address of NFT contributor who you'd like to reward with a copy of the given NFT at the end of the raffle cycle.
  ​
  **function setCuratorRole**
  ​
* Contract uses AccessControl(OpenZeppelin) that allows the creation of a DEFAULT\*ADMIN_ROLE and a CURATOR_ROLE -> means specific roles can trigger specific functions.
* Can revoke a role via the \_revokeCuratorRole\* function.

  ​
  _Now your contract is ready to roll._
  ​

* Can set up Raffles with given conditions using the **createRaffle** function.

  ​
  **function turnOnTokenRewards**
  ​
  Token rewards are optional -> turned off by default.

* If you would like to reward your donors with an ERC20-standard compatible reward token you can turn on the function by specifying:

- The reward token address
- The calculation formula address
- The ID of the raffle you want to use the rewards for.
  ​

* You need to send the reward tokens to the raffle contract
* You have to specify the amount of tokens you'd like to allocate for the raffle when you create it.
  ​
* The users can send their donations via the **donate** function -> all donations flow to the Treasury module.
  ​
* At end of the raffle you can reward your users with the NFTs and tokens with calling the **sendRewards** function.

  **function turnOnLimitedNftCollection**

  - You can turn on an NFT reward mechanism that rewards users​ with a given NFT if they donate above a certain amount that the organisation can specify.

  **function cancelRaffle**
  ​

* Cancel a running raffle
* Function ensures that users will get their donations back.
* NFTs and allocated reward tokens will go back to the DAO Wallet.
  ​
