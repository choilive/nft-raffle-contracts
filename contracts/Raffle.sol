pragma solidity 0.8.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@opengsn/contracts/src/BaseRelayRecipient.sol";
import "./interfaces/ITokenRewards.sol";

contract Raffle is Ownable, AccessControl, ReentrancyGuard, BaseRelayRecipient {
    address public DAOWallet;
    address public nftAuthorWallet;
    uint256 public raffleCount;
    uint256 public donationCount;
    IERC20 public USDC;
    IERC20 public REWARD_TOKEN;
    uint256 rewardTokenBalanceInContract;
    address tokenRewardsModuleAddress;
    bool optionalTokenRewards;
    bytes32 public constant CURATOR_ROLE = keccak256("CURATOR_ROLE");
    string public override versionRecipient = "2.2.6";
    // -------------------------------------------------------------
    // STORAGE
    // --------------------------------------------------------------
    struct Raffle {
        address nftContract; // address of NFT contract
        address nftOwner;
        uint256 tokenID;
        uint256 startTime;
        uint256 endTime;
        uint256 minimumDonationAmount;
        address topDonor;
        uint256 topDonatedAmount;
        bool cancelled;
    }
    struct Donation {
        address donor;
        uint256 raffleID;
        uint256 amount;
        uint256 timestamp;
    }

    mapping(uint256 => Raffle) public raffles;
    mapping(uint256 => Donation) public donations;
    // raffleID => amount
    mapping(uint256 => uint256) private totalDonationsPerCycle;
    // raffleID => address => amount
    mapping(uint256 => mapping(address => uint256))
        public totalDonationPerAddressPerCycle;
    // raffleID => addresses array
    mapping(uint256 => address[]) public donorsArrayPerCycle;
    // Mapping to ensure donor does not get added to donorsArrayPerCycle twice and get two refunds
    // TODO do we need a nested loop here from raffleID?
    mapping(address => bool) public donorExistsInArray;
    //raffleID => address
    mapping(uint256 => address) topDonor;
    // raffleID => amount
    mapping(uint256 => uint256) highestDonation;
    //  raffleID => address => donationIDs
    mapping(uint256 => mapping(address => uint256[])) donationCountPerAddressPerCycle;
    // --------------------------------------------------------------
    // EVENTS
    // --------------------------------------------------------------
    event RaffleCreated(
        address nftOwner,
        uint256 tokenID,
        uint256 startTime,
        uint256 endTime,
        uint256 minimumDonationAmount
    );
    event DonationPlaced(address from, uint256 raffleId, uint256 amount);
    event DAOWalletAddressSet(address walletAddress);
    event nftAuthorWalletAddressSet(address nftAuthorWallet);
    event NFTsentToWinner(uint256 raffleID, address winner);
    event RewardTokenBalanceToppedUp(uint256 amount);
    event tokensWithdrawnFromContract(address account, uint256 amount);
    // --------------------------------------------------------------
    // CUSTOM ERRORS
    // --------------------------------------------------------------
    error IncorrectTimesGiven();
    error ZeroAddressNotAllowed();
    error RaffleHasEnded();
    error DonationTooLow();
    error RaffleHasNotEnded();
    error InsufficientAmount();
    error RaffleCancelled();
    error CannotClaimRewards();
    error NoRewardsForRaffle();

    // --------------------------------------------------------------
    // CONSTRUCTOR
    // --------------------------------------------------------------
    constructor(
        address _usdc,
        address _forwarder,
        address _rewardTokenAddress
    ) {
        _setTrustedForwarder(_forwarder);
        USDC = IERC20(_usdc);
        REWARD_TOKEN = IERC20(_rewardTokenAddress);
        // Sets deployer as DEFAULT_ADMIN_ROLE
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(CURATOR_ROLE, msg.sender);
    }

    // --------------------------------------------------------------
    // STATE-MODIFYING FUNCTIONS
    // --------------------------------------------------------------
    /**
          @notice sets DAO wallet address for transfering funds
          @param _DAOWallet address of DAO wallet
      */
    function setDAOWalletAddress(address _DAOWallet)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (_DAOWallet == address(0)) revert ZeroAddressNotAllowed();
        DAOWallet = _DAOWallet;
        emit DAOWalletAddressSet(_DAOWallet);
    }

    /**
          @notice sets NFT author wallet address for transfering NFT at the end of raffle cycle
          @param _nftAuthorWallet address of NFT author wallet
      */
    function setNftAuthorWalletAddress(address _nftAuthorWallet)
        public
        onlyRole(CURATOR_ROLE)
    {
        if (_nftAuthorWallet == address(0)) revert ZeroAddressNotAllowed();
        nftAuthorWallet = _nftAuthorWallet;
        emit nftAuthorWalletAddressSet(_nftAuthorWallet);
    }

    /**
          @notice sets curator address for curator role
          @param  curator address of curator wallet
      */
    function setCuratorRole(address curator)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _grantRole(CURATOR_ROLE, curator);
    }

    function revokeCuratorRole(address curator)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        revokeRole(CURATOR_ROLE, curator);
    }

    function turnOnTokenRewards(address _tokenRewardsModuleAddress)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        optionalTokenRewards = true;
        tokenRewardsModuleAddress = _tokenRewardsModuleAddress;
    }

    /**
          @notice transfers reward tokens to the contract
          @param  amount amount of tokens to be transferred
      */
    function topUpRewardTokenBalance(uint256 amount)
        public
        onlyRole(CURATOR_ROLE)
    {
        rewardTokenBalanceInContract += amount;
        REWARD_TOKEN.transferFrom(DAOWallet, address(this), amount);
        emit RewardTokenBalanceToppedUp(amount);
    }

    /**
          @notice function for withdrawing reward token from contract
           @param  account address to withdraw tokens to
          @param  amount amount of tokens to be withdrawn
      */
    function withdraw(address account, uint256 amount)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (rewardTokenBalanceInContract <= amount) revert InsufficientAmount();
        rewardTokenBalanceInContract -= amount;
        REWARD_TOKEN.approve(address(this), amount);
        REWARD_TOKEN.transferFrom(address(this), account, amount);
        emit tokensWithdrawnFromContract(account, amount);
    }

    /**
          @notice creates a raffle
          @param _raffle object contains parameters for raffle created
      */
    function createRaffle(Raffle memory _raffle)
        public
        onlyRole(CURATOR_ROLE)
        returns (uint256)
    {
        address nftContractAddress = _raffle.nftContract;
        if (_raffle.startTime > _raffle.endTime) revert IncorrectTimesGiven();
        raffleCount++;
        raffles[raffleCount] = _raffle;
        emit RaffleCreated(
            _raffle.nftOwner,
            _raffle.tokenID,
            _raffle.startTime,
            _raffle.endTime,
            _raffle.minimumDonationAmount
        );
        IERC1155(nftContractAddress).safeTransferFrom(
            _raffle.nftOwner,
            address(this),
            _raffle.tokenID,
            4,
            ""
        );
        return raffleCount;
    }

    /**
          @notice cancels an existing raffle, refunds donors and sends NFT back to artist
          @param raffleID id of raffle
      */
    function cancelRaffle(uint256 raffleID)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (raffles[raffleID].endTime < block.timestamp)
            revert RaffleHasEnded(); // check this logic
        raffles[raffleID].cancelled = true;
        // refund donors
        address[] memory donorsArray = getDonorsPerCycle(raffleID);
        for (uint256 i = 0; i < donorsArray.length; i++) {
            uint256 refundPerAddress = getTotalDonationPerAddressPerCycle(
                raffleID,
                donorsArray[i]
            );
            USDC.transferFrom(DAOWallet, donorsArray[i], refundPerAddress);
        }
        // send NFTs back to owner
        uint256 refundTokenID = raffles[raffleID].tokenID;
        address tokenOwner = raffles[raffleID].nftOwner;
        address nftContractAddress = raffles[raffleID].nftContract;
        IERC1155(nftContractAddress).safeTransferFrom(
            address(this),
            tokenOwner,
            refundTokenID,
            4,
            ""
        );
    }

    /**
          @notice creates a donation on an raffle
          @param _donation object contains parameters for donation created
      */
    function donate(Donation memory _donation)
        public
        nonReentrant
        returns (uint256)
    {
        uint256 raffleId = _donation.raffleID;
        // Loading Raffle obj into memory for top donor calc
        Raffle memory currentRaffle = raffles[raffleId];
        if (raffles[raffleId].endTime < block.timestamp)
            revert RaffleHasEnded();
        if (_donation.amount <= raffles[raffleId].minimumDonationAmount)
            revert DonationTooLow();
        donationCount++;
        _donation.timestamp = block.timestamp;
        donations[donationCount] = _donation;
        // add amount to total donations per address per cycle
        totalDonationPerAddressPerCycle[raffleId][_msgSender()] += _donation
            .amount;
        // add amount to total donations per cycle
        totalDonationsPerCycle[raffleId] += _donation.amount;
        if (donorExistsInArray[_msgSender()] == false) {
            donorsArrayPerCycle[raffleId].push(_msgSender());
            donorExistsInArray[_msgSender()] = true;
        }
        uint256 donorsTotalDonationsInRaffle = totalDonationPerAddressPerCycle[
            raffleId
        ][_msgSender()];
        uint256 topDonation = currentRaffle.topDonatedAmount;
        // Calculate top donor and amount and update in Raffle obj
        if (currentRaffle.topDonor == _msgSender()) {
            // dont change top donor, just change amount
            currentRaffle.topDonatedAmount += _donation.amount;
            // Update raffle in storage
            raffles[raffleId] = currentRaffle;
        } else if (donorsTotalDonationsInRaffle > topDonation) {
            // New top donor, update both fiels in Raffle obj
            currentRaffle.topDonatedAmount = donorsTotalDonationsInRaffle;
            highestDonation[raffleId] = donorsTotalDonationsInRaffle;
            currentRaffle.topDonor = _msgSender();
            topDonor[raffleId] = _msgSender();
            // Update raffle in storage
            raffles[raffleId] = currentRaffle;
        }
        //transfer funds to contract
        USDC.transferFrom(_msgSender(), DAOWallet, _donation.amount);
        emit DonationPlaced(_msgSender(), raffleId, _donation.amount);
        return donationCount;
    }

    /**
          @notice distributes NFTs to winners at the end of a raffle cycle
          @param raffleID id of raffle
      */
    function sendNFTRewards(uint256 raffleID) public onlyRole(CURATOR_ROLE) {
        if (raffles[raffleID].endTime > block.timestamp)
            revert RaffleHasNotEnded();
        if (raffles[raffleID].cancelled == true) revert RaffleCancelled();
        // calculate randomDonor
        address randomDonor = _calcRandomDonor(raffleID);
        // get topDonor
        address topDonor = getTopDonor(raffleID);
        address nftContractAddress = raffles[raffleID].nftContract;
        uint256 tokenID = raffles[raffleID].tokenID;
        // transfer to random donor
        IERC1155(nftContractAddress).safeTransferFrom(
            address(this),
            topDonor,
            tokenID,
            1,
            ""
        );
        emit NFTsentToWinner(raffleID, topDonor);
        // transfer to random donor
        IERC1155(nftContractAddress).safeTransferFrom(
            address(this),
            randomDonor,
            tokenID,
            1,
            ""
        );
        emit NFTsentToWinner(raffleID, randomDonor);
        // transfer to DAO Wallet
        IERC1155(nftContractAddress).safeTransferFrom(
            address(this),
            DAOWallet,
            tokenID,
            1,
            ""
        );
        emit NFTsentToWinner(raffleID, DAOWallet);
        // transfer to NFT author
        IERC1155(nftContractAddress).safeTransferFrom(
            address(this),
            nftAuthorWallet,
            tokenID,
            1,
            ""
        );
        emit NFTsentToWinner(raffleID, nftAuthorWallet);
    }

    function claimTokenRewards(uint256 raffleID, address donor) public {
        if (!optionalTokenRewards) revert NoRewardsForRaffle();
        if (!donorExistsInArray[donor]) revert CannotClaimRewards();
        ITokenRewards(tokenRewardsModuleAddress).sendRewardsToUser(
            raffleID,
            donor
        );
        uint256 newBalance = USDC.balanceOf(address(this));
        rewardTokenBalanceInContract = newBalance;
    }

    // --------------------------------------------------------------
    // EXTERNAL FUNCTIONS
    // --------------------------------------------------------------
    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes memory data
    ) external pure returns (bytes4) {
        // 0xf23a6e61 = bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)")
        return 0xf23a6e61;
    }

    // --------------------------------------------------------------
    // INTERNAL STATE-MODIFYING FUNCTIONS
    // --------------------------------------------------------------
    function _calcRandomDonor(uint256 raffleID)
        internal
        view
        returns (address)
    {
        uint256 amountOfDonors = donorsArrayPerCycle[raffleID].length;
        uint256 randomIndex = uint256(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    block.number,
                    block.difficulty,
                    raffleID
                )
            )
        ) % amountOfDonors;
        address winner = donorsArrayPerCycle[raffleID][randomIndex];
        return winner;
    }

    // *** BICONOMY *** //
    function setTrustedForwarder(address _forwarder) public onlyOwner {
        _setTrustedForwarder(_forwarder);
    }

    function _msgSender()
        internal
        view
        override(Context, BaseRelayRecipient)
        returns (address sender)
    {
        sender = BaseRelayRecipient._msgSender();
    }

    function _msgData()
        internal
        view
        override(Context, BaseRelayRecipient)
        returns (bytes memory)
    {
        return BaseRelayRecipient._msgData();
    }

    // --------------------------------------------------------------
    // VIEW FUNCTIONS
    // --------------------------------------------------------------
    function getRaffle(uint256 raffleID) public view returns (Raffle memory) {
        return raffles[raffleID];
    }

    function getDonation(uint256 donationID)
        public
        view
        returns (Donation memory)
    {
        return donations[donationID];
    }

    function getTotalDonationsPerCycle(uint256 raffleID)
        public
        view
        returns (uint256)
    {
        return totalDonationsPerCycle[raffleID];
    }

    function getDonorsPerCycle(uint256 raffleID)
        public
        view
        returns (address[] memory)
    {
        return donorsArrayPerCycle[raffleID];
    }

    function getTotalDonationPerAddressPerCycle(
        uint256 raffleID,
        address account
    ) public view returns (uint256) {
        return totalDonationPerAddressPerCycle[raffleID][account];
    }

    function getHighestDonationPerCycle(uint256 raffleID)
        public
        view
        returns (uint256)
    {
        return highestDonation[raffleID];
    }

    function getTopDonor(uint256 raffleID) public view returns (address) {
        return topDonor[raffleID];
    }

    function getTokensInTheBufferEndOfCycle() public view returns (uint256) {
        return rewardTokenBalanceInContract;
    }
}
