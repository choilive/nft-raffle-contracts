pragma solidity 0.8.11;

import "erc721a/contracts/ERC721A.sol";
contract FreeRossPfpNft is ERC721A {
    
    /* ------ Storage ------ */

    uint256 public immutable maxSupply;
    uint256 public immutable maxPerWallet;
    uint256 public constant minDonation = 0.2 ether;

    constructor(uint256 _maxSupply, uint256 _maxPerWallet) ERC721A ("FreeRossPfp", "$FR") {
        maxSupply = _maxSupply;
        maxPerWallet = _maxPerWallet;
    }
}