# Raffle contract

​

- Mumbai Testnet Address:0x4838cF3eF6D79d625ffE3eDE73b843D99CF980Fd
  ​
  **Setting up your Raffle Contract**
  ​

* The Raffle creates raffle cycles with different IDs to incentivise donors to donate.
* End of each raffle cycle 4 given NFTs will be distributed to:

- donors
- creator of the artwork
- organisation that created the raffle.
  ​

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
* The users can send their donations via the **donate** function -> all donations flow to the previously set DAO Wallet.
  ​
* At end of the raffle you can reward your users with the NFTs and tokens with calling the **sendRewards** function.
  ​
  **function cancelRaffle**
  ​
* Cancel a running raffle
* Function ensures that users will get their donations back.
* NFTs and allocated reward tokens will go back to the DAO Wallet.
  ​

# ArtizenERC1155 contract

​

- Mumbai Testnet Address:
  0x64b141AA093cb409d5Dc1ccdcb7e4003d2A3B03e
  ​
  **function setURI**
  ​

* Sets a new URI for all token types -> by relying on the token type ID
* Only the owner of this contract can access this function
  ​
  **function mint**
  ​
* Creates amount tokens of token id, and assigns them to account.
* Mints a single token and assigns it to an account
* It is minted to an address, with the tokenID, 1 token
* After each mint the token ID increases by 1
* **whitelistedAddresses** only addresses on that list are able to call this function
  ​
  **function batchMint**
  ​
* Creates amount tokens of token id, and assigns them to account.
* Mints multiple tokens and assigns it to an account
* Distrubites multiple tokens with different tokenID's and more than 1 token to a address
* **whitelistedAddresses** only addresses on that list are able to call this function
  ​
  **function safeTransferFrom**
  ​
* Transfers amount tokens of token id from from to to
* The to address cannot be a zero address
  ​
  **isApprovedForAll**
  ​
* Only the owner can call the **function safeTransferFrom**
* Returns true if operator is approved to transfer account's tokens.

**function safeBatchTransferFrom**
​

- Transfers multiple amount tokens of token id's from address to the to address
- The to address cannot be a zero address
  ​
  **function addAddressToWhitelist**
  ​
- Only owner can call this function
- List of address that have first access to mint a token/tokens
