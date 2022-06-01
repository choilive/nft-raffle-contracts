const { expect } = require("chai");
// const { parseEther } = require("ethers/lib/utils");
const { ethers, waffle } = require("hardhat");

let ERC1155Contract;
let ERC1155Instance;
let owner;
let ownerAddress;

describe("ArtizenERC1155 contract tests", function () {
    beforeEach(async () => {
        owner = await ethers.getSigner();
        ownerAddress = await owner.getAddress();
        ERC1155Contract = await ethers.getContractFactory("ArtizenERC1155");
        ERC1155Instance = await ERC1155Contract.connect(owner).deploy();
    });
    describe("mint function", function () {
        it("mint works as expected", async () => {
            await ERC1155Instance.connect(owner).mint(ownerAddress, 1, 4, "0x");
            expect(await ERC1155Instance.balanceOf(ownerAddress, 1)).to.equal(4);
        });
        it("throws ERC1155: mint to the zero address", async () => {
            await expect(ERC1155Instance.connect(owner).mint(ethers.constants.AddressZero, 1, 4, "0x"))
                .to.be.revertedWith("ERC1155: mint to the zero address");
        });
    });
});