# Raffle









## Methods

### CURATOR_ROLE

```solidity
function CURATOR_ROLE() external view returns (bytes32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined

### DAOWallet

```solidity
function DAOWallet() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### DEFAULT_ADMIN_ROLE

```solidity
function DEFAULT_ADMIN_ROLE() external view returns (bytes32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined

### USDC

```solidity
function USDC() external view returns (contract IERC20)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IERC20 | undefined

### createRaffle

```solidity
function createRaffle(Raffle.Raffle _raffle) external nonpayable returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _raffle | Raffle.Raffle | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### donate

```solidity
function donate(Raffle.Donation _donation) external payable returns (uint256)
```

creates a donation on an raffle



#### Parameters

| Name | Type | Description |
|---|---|---|
| _donation | Raffle.Donation | object contains parameters for donation created

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### donationCount

```solidity
function donationCount() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### donations

```solidity
function donations(uint256) external view returns (uint256 raffleID, uint256 amount, uint256 timestamp)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| raffleID | uint256 | undefined
| amount | uint256 | undefined
| timestamp | uint256 | undefined

### donorsArrayPerCycle

```solidity
function donorsArrayPerCycle(uint256, uint256) external view returns (address)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined
| _1 | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### getDonationCountPerAddressPerCycle

```solidity
function getDonationCountPerAddressPerCycle(address donor, uint256 raffleID) external nonpayable returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| donor | address | undefined
| raffleID | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getDonorsPerCycle

```solidity
function getDonorsPerCycle(uint256 raffleID) external view returns (address[])
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| raffleID | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address[] | undefined

### getHighestDonationPerCycle

```solidity
function getHighestDonationPerCycle(uint256 raffleID) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| raffleID | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getRoleAdmin

```solidity
function getRoleAdmin(bytes32 role) external view returns (bytes32)
```



*Returns the admin role that controls `role`. See {grantRole} and {revokeRole}. To change a role&#39;s admin, use {_setRoleAdmin}.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| role | bytes32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined

### getTopDonor

```solidity
function getTopDonor(uint256 raffleID) external view returns (address)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| raffleID | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### getTotalDonationPerAddressPerCycle

```solidity
function getTotalDonationPerAddressPerCycle(uint256 raffleID, address account) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| raffleID | uint256 | undefined
| account | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getTotalDonationsPerCycle

```solidity
function getTotalDonationsPerCycle(uint256 raffleID) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| raffleID | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### grantRole

```solidity
function grantRole(bytes32 role, address account) external nonpayable
```



*Grants `role` to `account`. If `account` had not been already granted `role`, emits a {RoleGranted} event. Requirements: - the caller must have ``role``&#39;s admin role.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| role | bytes32 | undefined
| account | address | undefined

### hasRole

```solidity
function hasRole(bytes32 role, address account) external view returns (bool)
```



*Returns `true` if `account` has been granted `role`.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| role | bytes32 | undefined
| account | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### nftAuthorWallet

```solidity
function nftAuthorWallet() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### owner

```solidity
function owner() external view returns (address)
```



*Returns the address of the current owner.*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### raffleCount

```solidity
function raffleCount() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### raffles

```solidity
function raffles(uint256) external view returns (address nftContract, address nftOwner, uint256 tokenID, uint256 startTime, uint256 endTime, uint256 minimumDonationAmount)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| nftContract | address | undefined
| nftOwner | address | undefined
| tokenID | uint256 | undefined
| startTime | uint256 | undefined
| endTime | uint256 | undefined
| minimumDonationAmount | uint256 | undefined

### renounceOwnership

```solidity
function renounceOwnership() external nonpayable
```



*Leaves the contract without owner. It will not be possible to call `onlyOwner` functions anymore. Can only be called by the current owner. NOTE: Renouncing ownership will leave the contract without an owner, thereby removing any functionality that is only available to the owner.*


### renounceRole

```solidity
function renounceRole(bytes32 role, address account) external nonpayable
```



*Revokes `role` from the calling account. Roles are often managed via {grantRole} and {revokeRole}: this function&#39;s purpose is to provide a mechanism for accounts to lose their privileges if they are compromised (such as when a trusted device is misplaced). If the calling account had been revoked `role`, emits a {RoleRevoked} event. Requirements: - the caller must be `account`.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| role | bytes32 | undefined
| account | address | undefined

### revokeRole

```solidity
function revokeRole(bytes32 role, address account) external nonpayable
```



*Revokes `role` from `account`. If `account` had been granted `role`, emits a {RoleRevoked} event. Requirements: - the caller must have ``role``&#39;s admin role.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| role | bytes32 | undefined
| account | address | undefined

### sendNFTRewards

```solidity
function sendNFTRewards(uint256 raffleID) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| raffleID | uint256 | undefined

### setCuratorRole

```solidity
function setCuratorRole(address curator) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| curator | address | undefined

### setDAOWalletAddress

```solidity
function setDAOWalletAddress(address _DAOWallet) external nonpayable
```

sets DAO wallet address for transfering funds



#### Parameters

| Name | Type | Description |
|---|---|---|
| _DAOWallet | address | address of DAO wallet

### setNftAuthorWalletAddress

```solidity
function setNftAuthorWalletAddress(address _nftAuthorWallet) external nonpayable
```

sets NFT author wallet address for transfering NFT at the end of raffle cycle



#### Parameters

| Name | Type | Description |
|---|---|---|
| _nftAuthorWallet | address | address of NFT author wallet

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) external view returns (bool)
```



*See {IERC165-supportsInterface}.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| interfaceId | bytes4 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### totalDonationPerAddressPerCycle

```solidity
function totalDonationPerAddressPerCycle(uint256, address) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined
| _1 | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### transferOwnership

```solidity
function transferOwnership(address newOwner) external nonpayable
```



*Transfers ownership of the contract to a new account (`newOwner`). Can only be called by the current owner.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| newOwner | address | undefined



## Events

### DAOWalletAddressSet

```solidity
event DAOWalletAddressSet(address walletAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| walletAddress  | address | undefined |

### DonationPlaced

```solidity
event DonationPlaced(address from, uint256 raffleId, uint256 amount)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| from  | address | undefined |
| raffleId  | uint256 | undefined |
| amount  | uint256 | undefined |

### OwnershipTransferred

```solidity
event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| previousOwner `indexed` | address | undefined |
| newOwner `indexed` | address | undefined |

### RaffleCreated

```solidity
event RaffleCreated(uint256 startTime, uint256 endTime, uint256 minimumDonationAmount)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| startTime  | uint256 | undefined |
| endTime  | uint256 | undefined |
| minimumDonationAmount  | uint256 | undefined |

### RoleAdminChanged

```solidity
event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| role `indexed` | bytes32 | undefined |
| previousAdminRole `indexed` | bytes32 | undefined |
| newAdminRole `indexed` | bytes32 | undefined |

### RoleGranted

```solidity
event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| role `indexed` | bytes32 | undefined |
| account `indexed` | address | undefined |
| sender `indexed` | address | undefined |

### RoleRevoked

```solidity
event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| role `indexed` | bytes32 | undefined |
| account `indexed` | address | undefined |
| sender `indexed` | address | undefined |

### nftAuthorWalletAddressSet

```solidity
event nftAuthorWalletAddressSet(address nftAuthorWallet)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| nftAuthorWallet  | address | undefined |



## Errors

### DonationTooLow

```solidity
error DonationTooLow()
```






### IncorrectTimesGiven

```solidity
error IncorrectTimesGiven()
```






### RaffleHasEnded

```solidity
error RaffleHasEnded()
```






### RaffleHasNotEnded

```solidity
error RaffleHasNotEnded()
```






### ZeroAddressNotAllowed

```solidity
error ZeroAddressNotAllowed()
```







