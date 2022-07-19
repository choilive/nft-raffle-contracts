const { expect } = require("chai");
const { ethers } = require("hardhat");
const hre = require("hardhat");
const { BigNumber, utils } = require("ethers");

describe("Free Ross Pfp Nft tests", function () {
    let owner, ownerAddress
    let donor1, donor1Address
    let donor2, donor2Address
    let donor3, donor3Address

    let FreeRossNftContract, FreeRossNftInstance

    beforeEach(async () => {
        [owner, donor1, donor2, donor3] = await ethers.getSigners();
        ownerAddress = await owner.getAddress();
        donor1Address = await donor1.getAddress();
        donor2Address = await donor2.getAddress();
        donor3Address = await donor3.getAddress();

        FreeRossNftContract = await ethers.getContractFactory("FreeRossPfpNft");
        FreeRossNftInstance = await FreeRossNftContract.deploy(
            "Free Ross",
            "$FR",
            3,
            2
        );
    });

    describe("Initialization", function () {
        it("Contract initializes properly", async () => {
            expect(await FreeRossNftInstance.MAX_SUPPLY()).to.equal(3);
            expect(await FreeRossNftInstance.name()).to.equal("Free Ross");
            expect(await FreeRossNftInstance.symbol()).to.equal("$FR");
            expect(await FreeRossNftInstance.amountPerWallet()).to.equal(2);
        });
    });
    describe("mint tests", function () {
        it("mints successfully", async () => {
            expect(await FreeRossNftInstance.connect(donor1).ownerOf(1))
                .to.equal(ethers.constants.AddressZero);
            
            await FreeRossNftInstance.connect(donor1).mint(donor1Address);

            expect(await FreeRossNftInstance.connect(donor1).ownerOf(1))
                .to.equal(donor1Address);
        });
        it("cannot mint more than amountPerWallet", async () => {
            await FreeRossNftInstance.connect(donor1).mint(donor1Address);
            await FreeRossNftInstance.connect(donor1).mint(donor1Address);

            await expect(FreeRossNftInstance.connect(donor1).mint(donor1Address))
                .to.be.revertedWith("MAX AMOUNT ALREADY MINTED");
        });
        it("cannot mint more than MAX_SUPPLY", async () => {
            await FreeRossNftInstance.connect(donor1).mint(donor1Address);
            await FreeRossNftInstance.connect(donor2).mint(donor2Address);
            await FreeRossNftInstance.connect(donor1).mint(donor1Address);

            await expect(FreeRossNftInstance.connect(donor3).mint(donor3Address))
                .to.be.revertedWith("MINT HAS ENDED");            
        });
    });

    describe("setBaseURI", function () {
        it("sets the baseURI", async () => {
            expect(await FreeRossNftInstance.baseURI()).to.equal("");
            await FreeRossNftInstance.connect(owner).setBaseURI("ipfs://.../");
            expect(await FreeRossNftInstance.baseURI()).to.equal("ipfs://.../");
        });
        it("only owner can set the baseURI", async () => {
            await expect(FreeRossNftInstance.connect(donor1).setBaseURI("ipfs://.../"))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });
    });
    describe("uri", function () {
        it("returns the correct uri", async () => {
            await FreeRossNftInstance.connect(owner).setBaseURI("ipfs://.../");
            await FreeRossNftInstance.connect(donor1).mint(donor1Address);

            expect(await FreeRossNftInstance.connect(owner).uri(1))
                .to.equal("ipfs://.../1.json");

            await FreeRossNftInstance.connect(donor1).mint(donor1Address);

            expect(await FreeRossNftInstance.connect(owner).uri(2))
                .to.equal("ipfs://.../2.json");
        });
        it("throws invalid id", async () => {
            await expect(FreeRossNftInstance.connect(owner).uri(5))
                .to.be.revertedWith("invalid id");
        });
    });
});