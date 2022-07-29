pragma solidity 0.8.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@opengsn/contracts/src/BaseRelayRecipient.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "../interfaces/ITokenRewardsCalculation.sol";
import "../interfaces/IWrapper.sol";
import "../interfaces/ITreasuryModule.sol";

// import "../interfaces/ILimitedNFTCollection.sol";

contract RaffleModule is BaseRelayRecipient, Context, Ownable {
    uint256 public raffleCount;
    uint256 public donationCount;

    IERC20 public USDC;
    IERC20 public REWARD_TOKEN;

    address public wrapperContractAddress;
    address public organisationWallet;
    address public tokenRewardsModuleAddress;
    address public nftAuthorWallet;
    address public treasuryAddress;

    uint256 organisationID;

    //   bytes32 public constant CURATOR_ROLE = keccak256("CURATOR_ROLE");

    string public override versionRecipient = "2.2.6";

    // -------------------------------------------------------------
    // STORAGE
    // --------------------------------------------------------------
    struct Raffle {
        address nftContract; // address of NFT contract
        address nftOwner;
        uint256 raffleID;
        uint256 tokenID;
        uint256 startTime;
        uint256 endTime;
        uint256 minimumDonationAmount;
        address topDonor;
        uint256 topDonatedAmount;
        uint256 tokenAllocation;
        uint256 buffer;
        // address limitedNftCollectionAddress;
        bool cancelled;
    }

    struct Donation {
        address donor;
        uint256 raffleID;
        uint256 amount;
        uint256 timestamp;
    }
    mapping(uint256 => Raffle) public raffles;
    // raffleID => amount
    mapping(uint256 => Donation) public donations;
    // RaffleID => token rewards
    mapping(uint256 => bool) public tokenRewardsActivated;
    // RaffleID => limited nft collection
    // mapping(uint256 => bool) public limitedNFTCollectionActivated;
    mapping(uint256 => uint256) public minimumNFTDonation;
    mapping(uint256 => uint256) private totalDonationsPerCycle;
    // raffleID => address => amount
    mapping(uint256 => mapping(address => uint256))
        public totalDonationPerAddressPerCycle;
    // raffleID => addresses array
    mapping(uint256 => address[]) public donorsArrayPerCycle;
    // Mapping to ensure donor does not get added to donorsArrayPerCycle twice and get two refunds
    // raffleID => donor => donated
    mapping(uint256 => mapping(address => bool)) public donorExistsInArray;
    //raffleID => address
    mapping(uint256 => address) topDonor;
    // raffleID => amount
    mapping(uint256 => uint256) highestDonation;
    //  raffleID => address => donationIDs
    // mapping(uint256 => mapping(address => uint256[])) donationCountPerAddressPerCycle;
    //raffleID => account => if they've claimed funds already
    mapping(uint256 => mapping(address => bool)) rewardsClaimedPerCycle;
    mapping(address => uint256) totalRewardsClaimedPerAddress;

    /* This is to prevent duplication of donations when calculating rewards. */
    // checks if donation is already in allDonationsPerAddresses
    // RaffleID => Amount donated => bool
    mapping(uint256 => mapping(uint256 => bool)) addedToAllDonationsPerAddresses;
    // RaffleID => allDonationsPerAdrressArray
    mapping(uint256 => uint256[]) allDonationsPerAddresses;

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
    event RewardTokenAddressSet(address tokenAddress);
    event nftAuthorWalletAddressSet(address nftAuthorWallet);
    event NFTsentToWinner(uint256 raffleID, address winner);
    event RewardTokenBalanceToppedUp(uint256 amount);
    event tokensWithdrawnFromContract(address account, uint256 amount);
    event RewardsClaimedPerCycle(
        address donor,
        uint256 raffleID,
        uint256 amount
    );
    event RewardsTransferred(
        uint256 raffleID,
        address donor,
        uint256 amountToPay
    );
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
    error AmountsNotEqual();
    error NoMoreTokensToClaim();
    error MinimumDonationRequired();

    // --------------------------------------------------------------
    // CONSTRUCTOR
    // --------------------------------------------------------------

    constructor(
        address _usdc,
        address _forwarder,
        address _wrapperContractAddress,
        uint256 _organisationID,
        address newOwner
    ) {
        _setTrustedForwarder(_forwarder);
        USDC = IERC20(_usdc);

        // Sets deployer as DEFAULT_ADMIN_ROLE
        // _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        organisationID = _organisationID;
        wrapperContractAddress = _wrapperContractAddress;
        organisationWallet = IWrapper(wrapperContractAddress)
            .getOrgaisationWalletAddess(organisationID);
        treasuryAddress = IWrapper(wrapperContractAddress).getTreasuryAddress(
            organisationID
        );
        transferOwnership(newOwner);
    }

    // --------------------------------------------------------------
    // STATE-MODIFYING FUNCTIONS
    // --------------------------------------------------------------

    /**
        @notice sets NFT author wallet address for transfering NFT at the end of raffle cycle
        @param _nftAuthorWallet address of NFT author wallet
    */
    function setNftAuthorWalletAddress(address _nftAuthorWallet)
        public
        onlyOwner
    {
        if (_nftAuthorWallet == address(0)) revert ZeroAddressNotAllowed();
        nftAuthorWallet = _nftAuthorWallet;
        emit nftAuthorWalletAddressSet(_nftAuthorWallet);
    }

    function turnOnTokenRewards(address _rewardTokenAddress, uint256 _raffleID)
        public
        onlyOwner
    {
        if (_rewardTokenAddress == address(0)) revert ZeroAddressNotAllowed();
        REWARD_TOKEN = IERC20(_rewardTokenAddress);
        tokenRewardsModuleAddress = IWrapper(wrapperContractAddress)
            .getTokenRewardsCalculationAddress();
        tokenRewardsActivated[_raffleID] = true;

        // transfer reward tokens to contract
        _topUpRewardTokenBalance(_raffleID, raffles[_raffleID].tokenAllocation);
        emit RewardTokenAddressSet(_rewardTokenAddress);
    }

    // function turnOnLimitedNftCollection(
    //     address _limitedNftCollectionAddress,
    //     uint256 raffleID,
    //     uint256 _minimumNFTDonation
    // ) public {
    //     if (_limitedNftCollectionAddress == address(0))
    //         revert ZeroAddressNotAllowed();
    //     limitedNFTCollectionActivated[raffleID] = true;
    //     raffles[raffleID]
    //         .limitedNftCollectionAddress = _limitedNftCollectionAddress;
    //     minimumNFTDonation[raffleID] = _minimumNFTDonation;
    // }

    /**
        @notice function for withdrawing reward token from contract
         @param  account address to withdraw tokens to
        @param  amount amount of tokens to be withdrawn
       
    */
    function withdraw(address account, uint256 amount) public onlyOwner {
        if (REWARD_TOKEN.balanceOf(address(this)) < amount)
            revert InsufficientAmount();
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
        onlyOwner
        returns (uint256)
    {
        address nftContractAddress = _raffle.nftContract;
        if (_raffle.startTime > _raffle.endTime) revert IncorrectTimesGiven();
        if (_raffle.tokenAllocation != _raffle.buffer) revert AmountsNotEqual();
        raffleCount++;
        // Set the id of the raffle in the raffle struct
        _raffle.raffleID = raffleCount;
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
    function cancelRaffle(uint256 raffleID) public onlyOwner {
        if (raffles[raffleID].endTime < block.timestamp)
            revert RaffleHasEnded(); // check this logic
        raffles[raffleID].cancelled = true;

        uint256 protocolFee = IWrapper(wrapperContractAddress).getProtocolFee();

        // refund donors
        address[] memory donorsArray = getDonorsPerCycle(raffleID);
        for (uint256 i = 0; i < donorsArray.length; i++) {
            uint256 totalDonationPerAddress = getTotalDonationPerAddressPerCycle(
                    raffleID,
                    donorsArray[i]
                );

            uint256 calculateprotocolFee = (totalDonationPerAddress *
                protocolFee) / 100;
            uint256 refundPerAddress = totalDonationPerAddress -
                calculateprotocolFee;
            USDC.transferFrom(
                treasuryAddress,
                donorsArray[i],
                refundPerAddress
            );
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

        // transfers reward tokens back to Organisation Wallet

        uint256 refundAmount = raffles[raffleID].tokenAllocation;
        raffles[raffleID].tokenAllocation = 0;
        withdraw(organisationWallet, refundAmount);
    }

    /**
        @notice creates a donation on an raffle
        @param _donation object contains parameters for donation created
    */
    function donate(Donation memory _donation) public returns (uint256) {
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

        if (donorExistsInArray[raffleId][_msgSender()] == false) {
            donorsArrayPerCycle[raffleId].push(_msgSender());
            donorExistsInArray[raffleId][_msgSender()] = true;
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

        //funds move to treasury
        USDC.transferFrom(_msgSender(), treasuryAddress, _donation.amount);

        // calls function from treasury to register incoming donation
        ITreasuryModule(treasuryAddress).processDonationFromRaffle(
            _donation.raffleID,
            _donation.amount,
            organisationID,
            address(this)
        );

        // if (limitedNFTCollectionActivated[raffleId] == true) {
        //     if (_donation.amount < minimumNFTDonation[raffleId])
        //         revert MinimumDonationRequired();
        //     address nftCollectionAddress = raffles[_donation.raffleID]
        //         .limitedNftCollectionAddress;
        //     ILimitedNFTCollection(nftCollectionAddress).mint(msg.sender);
        // }
        emit DonationPlaced(_msgSender(), raffleId, _donation.amount);

        return donationCount;
    }

    /**
        @notice distributes NFTs to winners at the end of a raffle cycle
        @param raffleID id of raffle
    */
    function sendRewards(uint256 raffleID) public onlyOwner {
        if (raffles[raffleID].cancelled == true) revert RaffleCancelled();
        if (raffles[raffleID].endTime > block.timestamp)
            revert RaffleHasNotEnded();
        if (tokenRewardsActivated[raffleID] == false)
            revert NoRewardsForRaffle();

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
            organisationWallet,
            tokenID,
            1,
            ""
        );
        emit NFTsentToWinner(raffleID, organisationWallet);
        // transfer to NFT author
        IERC1155(nftContractAddress).safeTransferFrom(
            address(this),
            nftAuthorWallet,
            tokenID,
            1,
            ""
        );
        emit NFTsentToWinner(raffleID, nftAuthorWallet);

        // send token rewards to all donors in raffle
        address[] memory donorsArray = getDonorsPerCycle(raffleID);
        if (tokenRewardsActivated[raffleID] = true) {
            for (uint256 i = 0; i < donorsArray.length; i++) {
                claimTokenRewards(raffleID, donorsArray[i]);
            }
        }
    }

    function claimTokenRewards(uint256 raffleID, address donor) internal {
        if (!donorExistsInArray[raffleID][donor]) revert CannotClaimRewards();
        if (rewardsClaimedPerCycle[raffleID][donor] == true)
            revert CannotClaimRewards();
        // if (raffles[raffleID].endTime > block.timestamp)
        //     revert RaffleHasNotEnded();

        uint256 totalUserDonation = getTotalDonationPerAddressPerCycle(
            raffleID,
            donor
        );

        address[] memory donorsArray = getDonorsPerCycle(raffleID);

        //get all donation from all addresses donated from the cycle and push it into an array
        for (uint256 i = 0; i < donorsArray.length; i++) {
            uint256 donationPerAddress = getTotalDonationPerAddressPerCycle(
                raffleID,
                donorsArray[i]
            );
            // Check if donation has been added to array. If not, add it. Prevents duplication of donation
            if (
                addedToAllDonationsPerAddresses[raffleID][donationPerAddress] ==
                false
            ) {
                addedToAllDonationsPerAddresses[raffleID][
                    donationPerAddress
                ] = true;
                allDonationsPerAddresses[raffleID].push(donationPerAddress);
            }
        }
        uint256 tokenBuffer = getTokenBuffer(raffleID);
        uint256[]
            storage allDonationsPerAddress = _getAllDonationsPerAddressesArray(
                raffleID
            );
        // call rewards calculation contract
        uint256 amountToPay = ITokenRewardsCalculation(
            tokenRewardsModuleAddress
        ).calculateUserRewards(
                tokenBuffer,
                totalUserDonation,
                allDonationsPerAddress
            );
        rewardsClaimedPerCycle[raffleID][donor] = true;
        totalRewardsClaimedPerAddress[donor] += amountToPay;

        raffles[raffleID].tokenAllocation -= amountToPay;

        if (raffles[raffleID].tokenAllocation == 0)
            revert NoMoreTokensToClaim();

        //transferring rewards to donor
        REWARD_TOKEN.approve(address(this), amountToPay);
        REWARD_TOKEN.transferFrom(address(this), donor, amountToPay);

        emit RewardsTransferred(raffleID, donor, amountToPay);
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

    /**
        @notice transfers reward tokens to the contract
        @param  amount amount of tokens to be transferred
    */
    function _topUpRewardTokenBalance(uint256 raffleID, uint256 amount)
        internal
    {
        raffles[raffleID].tokenAllocation = amount;
        REWARD_TOKEN.transferFrom(organisationWallet, address(this), amount);

        emit RewardTokenBalanceToppedUp(amount);
    }

    // *** BICONOMY *** //

    function setTrustedForwarder(address _forwarder) public {
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

    function _getAllDonationsPerAddressesArray(uint256 raffleID)
        internal
        view
        returns (uint256[] storage)
    {
        return allDonationsPerAddresses[raffleID];
    }

    // --------------------------------------------------------------
    // VIEW FUNCTIONS
    // --------------------------------------------------------------

    // function getRaffle(uint256 raffleID) public view returns (Raffle memory) {
    //     return raffles[raffleID];
    // }

    // function getDonation(uint256 donationID)
    //     public
    //     view
    //     returns (Donation memory)
    // {
    //     return donations[donationID];
    // }

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

    function getTokenBuffer(uint256 raffleID) public view returns (uint256) {
        return raffles[raffleID].buffer;
    }
}
