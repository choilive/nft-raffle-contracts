// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ArtizenERC1155 is ERC1155, Ownable {
    mapping(address => bool) public whitelistedAddresses;

    string private _uri;

    constructor() ERC1155("") {}

    /*------ State Changing Functions ------*/

    function mint(
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public {
        require(whitelistedAddresses[to] == true, "NOT WHITELISTED");
        _mint(to, id, amount, data);
    }

    function batchMint(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public {
        require(whitelistedAddresses[to] == true, "NOT WHITELISTED");
        _mintBatch(to, ids, amounts, data);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public override {
        require(
            from == _msgSender() || isApprovedForAll(from, _msgSender()),
            "ERC1155: caller is not owner nor approved"
        );
        _safeTransferFrom(from, to, id, amount, data);
    }

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public override {
        require(
            from == _msgSender() || isApprovedForAll(from, _msgSender()),
            "ERC1155: transfer caller is not owner nor approved"
        );
        _safeBatchTransferFrom(from, to, ids, amounts, data);
    }

    function setURI(string memory uri) public onlyOwner {
        _setURI(uri);
    }

    function addAddressToWhitelist(address whitelisted) public onlyOwner {
        whitelistedAddresses[whitelisted] = true;
    }

    /*------ View Functions ------*/

    function uri(uint256) public view override returns (string memory) {
        return _uri;
    }

    /*------ Internal Functions ------*/

    function _setURI(string memory newuri) internal override {
        _uri = newuri;
    }
}
