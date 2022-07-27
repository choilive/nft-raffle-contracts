pragma solidity 0.8.11;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LimitedNFTCollection is ERC1155, Ownable {
    using Strings for uint256;

    uint256 public immutable MAX_SUPPLY;
    uint256 public immutable amountPerWallet;
    uint256 public currentIndex = 1;

    string public name;
    string public symbol;
    string public baseURI;

    mapping(uint256 => address) private _ownerOf;
    mapping(address => uint256) public amountPerWalletOwned;

    event BaseURISet(string);

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _MAX_SUPPLY,
        uint256 _amountPerWallet
    ) ERC1155("") {
        name = _name;
        symbol = _symbol;
        MAX_SUPPLY = _MAX_SUPPLY;
        amountPerWallet = _amountPerWallet;
    }

    function mint(address _to) public {
        uint256 _currentIndex = currentIndex;
        require(_currentIndex < MAX_SUPPLY + 1, "MINT HAS ENDED");
        require(
            amountPerWalletOwned[_to] < amountPerWallet,
            "MAX AMOUNT ALREADY MINTED"
        );

        _mint(_to, _currentIndex, 1, "");

        _ownerOf[_currentIndex] = _to;
        amountPerWalletOwned[_to] += 1;

        unchecked {
            _currentIndex++;
        }
        currentIndex = _currentIndex;
    }

    function uri(uint256 id) public view override returns (string memory) {
        require(id <= currentIndex, "invalid id");
        return string(abi.encodePacked(baseURI, id.toString(), ".json"));
    }

    function ownerOf(uint256 _id) public view returns (address) {
        return _ownerOf[_id];
    }

    function setBaseURI(string memory _baseURI) public onlyOwner {
        baseURI = _baseURI;
        emit BaseURISet(_baseURI);
    }
}
