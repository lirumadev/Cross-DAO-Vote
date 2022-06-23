const { ethers, upgrades } = require("hardhat");
const {MerkleTree} = require("merkletreejs");
const keccak256 = require("keccak256");

const main = async () => {
    const nftContractFactory = await hre.ethers.getContractFactory("DAOToken");
    const nftContract = await hre.upgrades.deployProxy(nftContractFactory);
    await nftContract.deployed();
    console.log("NFT contract deployed to: ", nftContract.address);

    const daoContractFactory = await hre.ethers.getContractFactory("DAOVote");
    const daoContract = await hre.upgrades.deployProxy(daoContractFactory);
    await daoContract.deployed();
    console.log("DAO contract deployed to: ", daoContract.address);

    const [signer1, signer2] = await ethers.getSigners(2)

    // mint 10 DAO token for signer1
    await nftContract.mint(signer1.address, 1, 10, "0x00");

    // set approval for DAOVote contract for signer1's token
    await nftContract.setApprovalForAll(daoContract.address, true);

    // list of contract addresses that will be used during proposal creation.
    // these addresses will be the allowed ERC1155 contract for casting votes. 
    const addresses = [ nftContract.address,
                        "0x1C541e05a5A640755B3F1B2434dB4e8096b8322f",
                        "0x1071258E2C706fFc9A32a5369d4094d11D4392Ec",
                        "0x25f7fF7917555132eDD3294626D105eA1C797250",
                        "0xF6574D878f99D94896Da75B6762fc935F34C1300",
                        "0xfDbAb374ee0FC0EA0D7e7A60917ac01365010bFe",
                        "0xfB73f8B1DcD5d61D4dDC3872dA53200B8562F243",
                        "0x95F6E4C94857f605b9A73c9163D5c94AAf849c40",
                        "0xEd2C82417256DF74a995213713A586E07d3e5255",
                        "0xCb14d0D43BB32705fAbbD863f860A1410fa14613",
                        "0x7a865e44988a2ebcad845E977db07C71f8c62d31",
                        "0x340F5bEcB63a33B53959026d0CEb1f83C53A102F",
                        "0x969560dBBf4872049D0d245791eD74dEd0D66578",
                        "0x81B8888dfbdcc3Ad1dfe30A6f58a6d47eaf99aE8"];
    
    // setting up the merkle tree
    const leaves = addresses.map(x => keccak256(x))
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true })
    const buf2hex = x => '0x' + x.toString('hex')
    
    // setting the root
    // each proposal will have different root
    const rootHash = buf2hex(tree.getRoot());
    // console.log("buf2hex", buf2hex(tree.getRoot()))

    // setting the leaf and proof
    // leaf and proof will be used when verifying against root during vote
    const leaf = keccak256(nftContract.address) 
    const proof = tree.getProof(leaf).map(x => buf2hex(x.data))

    const deadline = ethers.constants.MaxUint256
    const temp_r = "0xd693b532a80fed6392b428604171fb32fdbf953728a3a7ecc7d4062b1652c042"
    const temp_s = "0x24e9c602ac800b983b035700a14b23f78a253ab762deab5dc27e3555a750b354"
    
    let value = await nftContract.balanceOf(signer1.address, 1)
    console.log("/////////// BEFORE CREATE PROPOSAL ///////////")
    console.log("signer1 balance:", value.toNumber())

    // signer1 create proposal
    let proposal = await daoContract.createProposal(nftContract.address, 1, 24, deadline, 1, temp_r, temp_s, rootHash);
    let proposalReceipt = await proposal.wait();

    const event = proposalReceipt.events.find(event => event.event === "ProposalCreated");
    const [proposalId, sender, contractAcc, tokenId] = event.args;    
    
    // account contract created for signer1 after proposal creation
    let accountContract = await daoContract.getAccount(signer1.address);
    
    console.log("\n/////////// AFTER CREATE PROPOSAL ///////////")
    value = await nftContract.balanceOf(signer1.address, 1)
    console.log("signer1 balance:", value.toNumber())
    value = await nftContract.balanceOf(accountContract, 1)
    console.log("signer1 account contract balance:", value.toNumber())

    // transfer three(3) tokens from signer1 to signer2
    await nftContract.safeTransferFrom(signer1.address, signer2.address, 1, 3, "0x00");

    console.log("\n/////////// AFTER SIGNER1 TRANSFER 3 TOKENS TO SIGNER2 ///////////")
    value = await nftContract.balanceOf(signer1.address, 1)
    console.log("signer1 balance:", value.toNumber())
    value = await nftContract.balanceOf(accountContract, 1)
    console.log("signer1 account contract balance:", value.toNumber())
    value = await nftContract.balanceOf(signer2.address, 1)
    console.log("signer2 balance:", value.toNumber())

    // get signer2 signature for permit
    const { v, r, s } = await getPermitSignature(
        signer2,
        nftContract,
        daoContract.address,
        value,
        deadline
      ) 
    
    // signer2 vote
    vote = await daoContract.connect(signer2).vote(nftContract.address, 1, proposalId, 0, deadline, v, r, s, proof)
    // account contract created for signer2 after vote
    let accountContractSigner2 = await daoContract.getAccount(signer2.address);

    console.log("\n/////////// AFTER SIGNER2 VOTE ///////////")
    value = await nftContract.balanceOf(signer1.address, 1)
    console.log("signer1 balance:", value.toNumber())
    value = await nftContract.balanceOf(accountContract, 1)
    console.log("signer1 account contract balance:", value.toNumber())
    value = await nftContract.balanceOf(signer2.address, 1)
    console.log("signer2 balance:", value.toNumber())
    value = await nftContract.balanceOf(accountContractSigner2, 1)
    console.log("signer2 account contract balance:", value.toNumber())

    // signer1(proposer) cancel proposal to allow token claim
    await daoContract.cancelProposal(proposalId);

    // signer2 claim
    await daoContract.connect(signer2).claim(proposalId);

    console.log("\n/////////// AFTER SIGNER2 TOKEN CLAIM ///////////")
    value = await nftContract.balanceOf(signer1.address, 1)
    console.log("signer1 balance:", value.toNumber())
    value = await nftContract.balanceOf(accountContract, 1)
    console.log("signer1 account contract balance:", value.toNumber())
    value = await nftContract.balanceOf(signer2.address, 1)
    console.log("signer2 balance:", value.toNumber())
    value = await nftContract.balanceOf(accountContractSigner2, 1)
    console.log("signer2 account contract balance:", value.toNumber())

    console.log("\n/////////// END OF TESTING ///////////")

};


async function getPermitSignature(signer, token, spender, value, deadline) {
    const [nonce, name, version, chainId] = await Promise.all([
    token.nonces(signer.address),
    "DAOPermit", // name of initiated EIP-712
      "1", // version of EIP-712
      31337 //signer.getChainId(),
    ])
  
    return ethers.utils.splitSignature(
      await signer._signTypedData(
        {
          name,
          version,
          chainId,
          verifyingContract: token.address,
        },
        {
          Permit: [
            {
              name: "owner",
              type: "address",
            },
            {
              name: "spender",
              type: "address",
            },
            {
              name: "value",
              type: "uint256",
            },
            {
              name: "nonce",
              type: "uint256",
            },
            {
              name: "deadline",
              type: "uint256",
            },
          ],
        },
        {
          owner: signer.address,
          spender,
          value,
          nonce,
          deadline,
        }
      )
    )
  }

const runMain = async () => {
    try {
        await main();
        process.exit(0);
        
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
};

runMain();