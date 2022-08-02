pragma solidity 0.8.11;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// This contract was created for testing purposes only, DO NOT DEPLOY
contract ArtToken is ERC20 {
  constructor(
    string memory name_,
    string memory symbol_,
    uint256 totalSupply_
  ) ERC20(name_, symbol_) {}

  function mint(address _to, uint256 _amount) public {
    _mint(_to, _amount);
  }
}
