const { expect } = require("chai");
const { ethers } = require("hardhat");
const hre = require("hardhat");
const { BigNumber } = require("ethers");

describe("Free Ross Pfp Nft tests", function () {
    let owner, ownerAddress
    let donor1, donor1Address
    let donor2, donor2Address

    let FreeRossNftContract, FreeRossNftInstance

    beforeEach(async () => {
        [owner, donor1, donor2] = await ethers.getSigners();
        ownerAddress = await owner.getAddress();
        donor1Address = await donor1.getAddress();
        donor1Address = await donor1.getAddress();

        FreeRossNftContract = await ethers.getContractFactory("FreeRossPfpNft");
        FreeRossNftInstance = await FreeRossNftContract.deploy();
    });
});