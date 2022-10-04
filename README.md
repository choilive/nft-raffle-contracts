# Raffle contract
  ​
* The Raffle creates raffle cycles with different IDs to incentivise donors to donate.
* End of each raffle cycle 4 given NFTs will be distributed to:
  - top donor
  - ramdom donor
  - creator of the artwork
  - organisation that created the raffle.
  ​
* On deployment the currency address (USDC) & Biconomy connection address has to be set within constructor.

  ​
### function setDAOWalletAddress
* Where central DAO wallet address has to be set after deployment to ensure the flow of donations to this wallet address.
### function setNftAuthorWalletAddress
* Set wallet address of NFT contributor who you'd like to reward with a copy of the given NFT at the end of the raffle cycle.
  ​
### function setCuratorRole
* Contract uses AccessControl(OpenZeppelin) that allows the creation of a DEFAULT\*ADMIN_ROLE and a CURATOR_ROLE -> means specific roles can trigger specific functions.
* Can revoke a role via the \_revokeCuratorRole\* function.
 
  ​
 _Now your contract is ready to roll._
​
* Can set up Raffles with given conditions using the **createRaffle** function.
 ​
### function turnOnTokenRewards
  ​
  Token rewards are optional -> turned off by default.

* If you would like to reward your donors with an ERC20-standard compatible reward token you can turn on the function by specifying:

  - The reward token address
  - The calculation formula address
  - The ID of the raffle you want to use the rewards for.
  
* Reward tokens are transfered from DAOWallet to the raffle contract
* You have to specify the amount of tokens you'd like to allocate for the raffle when you create it.
  ​
* The users can send their donations via the **donate** function -> all donations are kept in the contract and flow to the previously set DAO Wallet when raffle ends
  ​
* At end of the raffle you can reward your users with the NFTs and tokens with calling the **sendRewards** function.

  ​
### function cancelRaffle
  ​

* Cancel a running raffle
* Function ensures that users will get their donations back.
* NFTs and allocated reward tokens will go back to the DAO Wallet.
  ​

# ArtizenERC1155 contract

### function setURI
* Sets a new URI per token id
* Only the owner of this contract can access this function
### function mint
  ​
* Creates amount tokens of token id, and assigns them to account.
* Mints a single token and assigns it to an account
* It is minted to an address, with the tokenID, 1 token
* After each mint the token ID increases by 1

* **whitelistedAddresses** only addresses on that list are able to call this function
  ​
### function batchMint
  ​
* Creates amount tokens of token id, and assigns them to account.
* Mints multiple tokens and assigns it to an account
* Distrubites multiple tokens with different tokenID's and more than 1 token to a address
* **whitelistedAddresses** only addresses on that list are able to call this function
  ​
### function safeTransferFrom
  ​
* Transfers amount tokens of token id from from to to
* The to address cannot be a zero address
### isApprovedForAll
  ​
* Only the owner can call the **function safeTransferFrom**
* Returns true if operator is approved to transfer account's tokens.

### function safeBatchTransferFrom
​

- Transfers multiple amount tokens of token id's from address to the to address
- The to address cannot be a zero address
  ​
### function addAddressToWhitelist
  ​
- Only owner can call this function
- List of address that have first access to mint a token/tokens


# TEST Contracts

Successfully verified contract ArtToken on Etherscan.
https://mumbai.polygonscan.com/address/0x70FAc2461795E62c5a92F9C8A49618418dbe243B#code
✅ ArtToken verified!

Successfully verified contract RaffleV2 on Etherscan.
https://mumbai.polygonscan.com/address/0x05990C6461ca044327903E5e0C5B7992A0AaD5E0#code
✅ RaffleV2 verified!

Successfully verified contract ArtizenERC1155 on Etherscan.
https://mumbai.polygonscan.com/address/0xaAfFF046B0A7c09F2e4350DEfCddC9a097Bd1492#code
✅ ArtizenERC1155 verified!

Successfully verified contract TokenRewardsCalculationV2 on Etherscan.
https://mumbai.polygonscan.com/address/0xE692765bCA154e20a3A174105c841d26F11CF0C3#code
✅ TokenRewardsCalculationV2 verified!

# Testing ART token rewards on staging

## Assumptions for testing

We make the following assumptions for testing ART token rewards:

* The MetaMask testing account is able to perform donations successfully
    * In particular, this test flow does not aim to test for edge cases / failures in the donation flow
    * Test account should have sufficient balance on mumbai testnet
        * at least 500 USDC
        * at least 5m ARTTEST
        * at least 2 MATIC
* Addresses listed below were used for testing in late September 2022

## Useful links

* contracts on Mumbai (polygon testnet)
    * ARTTEST tokens
        * contract (including methods): https://mumbai.polygonscan.com/address/0x70fac2461795e62c5a92f9c8a49618418dbe243b
        * token (including total supply): https://mumbai.polygonscan.com/token/0x70fac2461795e62c5a92f9c8a49618418dbe243b

## End-to-end test of ART token rewards on staging

* Import Artizen Test Account into MetaMask (NB. here we assume familiarity with MetaMask)
    * Artizen Test Account details:
        * Address: 0x02F300C0C1ED345abB4386fb1e4761C0774dc361
        * Private Key: (get from Artizen core team)
    * Rename (under Metamask > Account Details) to “Artizen Test Account”
    * Switch to Mumbai network (NB. may need to add Mumbai-Testnet network to metamask)
    * Import tokens in metamask
        * 0x566368d78DBdEc50F04b588E152dE3cEC0d5889f (USDC)
        * 0x70FAc2461795E62c5a92F9C8A49618418dbe243B (ARTTEST)
* Go to https://lab.artizen.fund/admin/raffles
    * Connect MetaMask — BE SURE TO USE IMPORTED ARTIZEN TEST ACCOUNT ON MUMBAI NETWORK
    * Create a raffle (if a raffle is not running)
        * Example Token (NFT) URI: https://gateway.pinata.cloud/ipfs/QmaQu8ehhzX9qMfSEMoMKQonsHj7jnzEuothwk3rApc2ze
        * Change end time to say 10 minutes in the future
        * Change token allocation as you see fit (something between 100 and 1,000,000 say)
        * Click “Create Raffle” button
            * you’ll need to approve several transactions in MetaMask
                * contract interaction
                    * address: 0xaAfFF046B0A7c09F2e4350DEfCddC9a097Bd1492
                    * optional: add nickname “ArtizenERC1155” in metamask for this address
                * Approve Token with no spend limit (Give permission to access all of your NFT)
                    * address: 0x374e81353e73a21f64b7bbe7869175883c562b7b
                * contract interaction
                    * address: 0x374e81353e73a21f64b7bbe7869175883c562b7b
                    * Optional: add nickname “Artizen RaffleV2” in metamask for this address
                * Approve ARTTEST spend limit (Give permission to access your ARTTEST?)
                    * address: 0x374e81353e73a21f64b7bbe7869175883c562b7b (same as an earlier step)
                * (contract interaction?)
        * Make some donations (requires USDC on Mumbai)
            * Test user 1: donate $10 via polygon 
            * Test user 1: donate again, this time $20 via polygon
            * Test user 2: donate $10 via polygon
                * to do this, log out and log back in with a different email address
            * So the donation total list is [$30, $10]
            * ARTTEST rewards percentages are [63.39745962155614, 36.60254037844387]
        * After raffle end time passes, end the raffle on the /admin/raffles UI
            * This requires confirmation in MetaMask
                * Send rewards
                    * tx might fail due to “out of gas”
                        * fix: increase gas limit in metamask for the transaction
            * If total tokens allotted was 500,000, then expect users to receive close to [316987, 183012] tokens
