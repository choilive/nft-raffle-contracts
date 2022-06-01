// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
// import "@openzeppelin/contracts/utils/introspection/ERC165Storage.sol";

contract ArtizenERC1155 is ERC1155 {

    // mapping (uint256 => string) private _uris;

    constructor() ERC1155("") {
        // ERC165Storage._registerInterface(type(IERC1155).interfaceId);
        // ERC165Storage._registerInterface(type(IERC1155MetadataURI).interfaceId);
    }

    function mint(
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data) public {
            _mint(to, id, amount, data);
    }

    function batchMint(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data) public {
            _mintBatch(to, ids, amounts, data);
    }
    
    // function mintWithUri(address to, uint256 id, uint256 amount, string memory tokenUri) public {
    //     _mint(to, id, amount, "");
    //     _setTokenURI(id, tokenUri);
    // }

    // function mintBatchWithUri(
    // address[] memory to, 
    // uint256[] memory ids, 
    // uint256[] memory amounts, 
    // string[] memory uris
    // ) public {
    //     require(to.length == ids.length &&
    //         ids.length == amounts.length &&
    //         amounts.length == uris.length,
    //         "mint:array length mismatch"
    //     );
    //     for (uint256 i = 0; i < to.length; i++) {
    //         _mint(to[i], ids[i], amounts[i], "");
    //         _setTokenURI(ids[i], uris[i]);
    //     }
    // }

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

    /*------ Internal Functions ------*/

    // function _setTokenURI(uint256 id, string memory tokenUri) internal {
    //     _uris[id] = tokenUri;
    //     emit URI(tokenUri, id);
    // }

    /*------- View Functions -------*/
    // function supportsInterface(bytes4 interfaceId) 
    // public 
    // view 
    // override(ERC165Storage, ERC1155)
    // returns(bool)
    // {
    //     return ERC165Storage.supportsInterface(interfaceId);
    // }
}