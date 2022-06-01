const { expect } = require("chai");
// const { parseEther } = require("ethers/lib/utils");
const { ethers, waffle } = require("hardhat");

let ERC1155Contract;
let ERC1155Instance;
let owner, alice, bob;
let ownerAddress, aliceAddress, bobAddress;

describe("ArtizenERC1155 contract tests", function () {
    beforeEach(async () => {
        [owner, alice, bob] = await ethers.getSigners();
        ownerAddress = await owner.getAddress();
        aliceAddress = await alice.getAddress();
        bobAddress = await bob.getAddress();

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
        it("emits TransferSingle", async () => {
            expect(
                await ERC1155Instance.connect(owner).mint(ownerAddress, 1, 4, "0x")
                ).to.emit(ERC1155Instance, "TransferSingle").withArgs(
                    ownerAddress,
                    ethers.constants.AddressZero,
                    ownerAddress,
                    1,
                    4);
        });
    });
    
    describe("batchMint function", function () {
        it("batchMint works as expected", async () => {
            await ERC1155Instance.connect(owner).batchMint(ownerAddress, [1,2,3,4], [4,3,2,1], "0x");
            expect(await ERC1155Instance.balanceOf(ownerAddress, 1)).to.equal(4);
            expect(await ERC1155Instance.balanceOf(ownerAddress, 2)).to.equal(3);
            expect(await ERC1155Instance.balanceOf(ownerAddress, 3)).to.equal(2);
            expect(await ERC1155Instance.balanceOf(ownerAddress, 4)).to.equal(1);
        });
        it("throws ERC1155: mint to the zero address", async () => {
            await expect(ERC1155Instance.connect(owner).batchMint(ethers.constants.AddressZero, [1,2,3,4], [4,3,2,1], "0x"))
                .to.be.revertedWith("ERC1155: mint to the zero address");
        });
        it("throws ERC1155: ids and amounts length mismatch", async () => {
            await expect(ERC1155Instance.connect(owner).batchMint(ownerAddress, [1,2,3], [4,3,2,1], "0x"))
                .to.be.revertedWith("ERC1155: ids and amounts length mismatch");
        });
        it("emits TransferBatch", async () => {
            expect(
                await ERC1155Instance.connect(owner).batchMint(ownerAddress, [1,2,3,4], [4,3,2,1], "0x")
                ).to.emit(ERC1155Instance, "TransferBatch").withArgs(
                    ownerAddress,
                    ethers.constants.AddressZero,
                    ownerAddress,
                    [1,2,3,4],
                    [4,3,2,1]);
        });
    });
    describe("safeTransferFrom function", function () {
        it("safeTransferFrom works as expected", async () => {
            await ERC1155Instance.connect(owner).mint(ownerAddress, 1, 4, "0x");
            expect(await ERC1155Instance.balanceOf(ownerAddress, 1)).to.equal(4);

            await ERC1155Instance.connect(owner).setApprovalForAll(bobAddress, true);
            expect(await ERC1155Instance.connect(owner).isApprovedForAll(ownerAddress, bobAddress))
                .to.equal(true);

            await ERC1155Instance.connect(bob).safeTransferFrom(
                ownerAddress,
                aliceAddress,
                1,
                3,
                "0x"
            );

            expect(await ERC1155Instance.balanceOf(ownerAddress, 1)).to.equal(1);
            expect(await ERC1155Instance.balanceOf(aliceAddress, 1)).to.equal(3);

            await ERC1155Instance.connect(owner).safeTransferFrom(
                ownerAddress,
                bobAddress,
                1,
                1,
                "0x"
            );

            expect(await ERC1155Instance.balanceOf(bobAddress, 1)).to.equal(1);
        });
        it("throws ERC1155: caller is not owner nor approved", async () => {
            await ERC1155Instance.connect(owner).mint(ownerAddress, 1, 4, "0x");

            await expect(ERC1155Instance.connect(bob).safeTransferFrom(
                ownerAddress,
                aliceAddress,
                1,
                3,
                "0x"
            )).to.be.revertedWith("ERC1155: caller is not owner nor approved");
        });
        it("throws ERC1155: transfer to the zero address", async () => {
            await ERC1155Instance.connect(owner).mint(ownerAddress, 1, 4, "0x");

            await expect(ERC1155Instance.connect(owner).safeTransferFrom(
                ownerAddress,
                ethers.constants.AddressZero,
                1,
                3,
                "0x"
            )).to.be.revertedWith("ERC1155: transfer to the zero address");
        });
        it("throws ERC1155: insufficient balance for transfer", async () => {
            await ERC1155Instance.connect(owner).mint(ownerAddress, 1, 4, "0x");

            await expect(ERC1155Instance.connect(owner).safeTransferFrom(
                ownerAddress,
                aliceAddress,
                1,
                5,
                "0x"
            )).to.be.revertedWith("ERC1155: insufficient balance for transfer");
        });
        it("emits TransferSingle", async () => {
            await ERC1155Instance.connect(owner).mint(ownerAddress, 1, 4, "0x");
            await ERC1155Instance.connect(owner).setApprovalForAll(bobAddress, true);
            expect(await ERC1155Instance.connect(bob).safeTransferFrom(
                ownerAddress,
                aliceAddress,
                1,
                3,
                "0x"
            )).to.emit(ERC1155Instance, "TransferSingle").withArgs(
                bobAddress,
                ownerAddress,
                aliceAddress,
                1,
                3);
        });
    });
    describe("safeBatchTransferFrom function", function () {
        it("safeBatchTransferFrom works as expected", async () => {
            await ERC1155Instance.connect(owner).batchMint(ownerAddress, [1,2,3,4], [4,3,2,1], "0x");
            await ERC1155Instance.connect(owner).setApprovalForAll(bobAddress, true);
            
            await ERC1155Instance.connect(bob).safeBatchTransferFrom(
                ownerAddress,
                aliceAddress,
                [1,2],
                [4,3],
                "0x"
            );

            await ERC1155Instance.connect(bob).safeBatchTransferFrom(
                ownerAddress,
                bobAddress,
                [3,4],
                [2,1],
                "0x"
            );
            let [aliceBalance, bobBalance] = await ERC1155Instance.balanceOfBatch([aliceAddress, bobAddress], [1,3]);
            expect(aliceBalance).to.equal(4);
            expect(bobBalance).to.equal(2);
        });
        it("throws ERC1155: transfer caller is not owner nor approved", async () => {
            await ERC1155Instance.connect(owner).batchMint(ownerAddress, [1,2,3,4], [4,3,2,1], "0x");
            await expect(ERC1155Instance.connect(bob).safeBatchTransferFrom(
                ownerAddress,
                aliceAddress,
                [1,2],
                [4,3],
                "0x"
            )).to.be.revertedWith("ERC1155: transfer caller is not owner nor approved");
        });
        it("emits TransferBatch", async () => {
            await ERC1155Instance.connect(owner).batchMint(ownerAddress, [1,2,3,4], [4,3,2,1], "0x");
            await expect(ERC1155Instance.connect(owner).safeBatchTransferFrom(
                ownerAddress,
                aliceAddress,
                [1,2],
                [4,3],
                "0x"
            )).to.emit(ERC1155Instance, "TransferBatch").withArgs(
                ownerAddress,
                ownerAddress,
                aliceAddress,
                [1,2],
                [4,3]
            );
        });
    });
});