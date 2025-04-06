import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Solcast } from "../target/types/solcast";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import assert from "assert";

describe("solcast", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.solcast as Program<Solcast>;
  
  // Store the state account and market account for tests
  let stateAccount: anchor.web3.Keypair;
  let marketAccount: anchor.web3.Keypair;
  let marketId: string;
  let marketAuthority: PublicKey;
  let marketAuthorityBump: number;
  
  // Create a new user for testing
  const user = anchor.web3.Keypair.generate();
  
  before(async () => {
    // Airdrop SOL to the user for testing
    const signature = await provider.connection.requestAirdrop(
      user.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(signature);
  });
  
  it("Initializes the Solcast contract", async () => {
    // Generate a new keypair for the state account
    stateAccount = anchor.web3.Keypair.generate();
    
    // Initialize the contract
    await program.methods
      .initialize()
      .accounts({
        state: stateAccount.publicKey,
        admin: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([stateAccount])
      .rpc();
    
    // Fetch the newly created state account
    const state = await program.account.state.fetch(stateAccount.publicKey);
    
    // Verify the state was initialized correctly
    assert.equal(state.admin.toString(), provider.wallet.publicKey.toString());
    assert.equal(state.marketIds.length, 0);
    assert.equal(state.marketIdCounter.toNumber(), 0);
    assert.equal(state.lastMarketId.toNumber(), 0);
    
    console.log("Solcast contract initialized successfully!");
  });
  
  it("Creates a new market", async () => {
    // Generate a new keypair for the market account
    marketAccount = anchor.web3.Keypair.generate();
    
    // Market parameters
    marketId = "test-market-1";
    const options = ["Yes", "No"];
    const endTime = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now
    const bannerUrl = "https://example.com/banner.jpg";
    const description = "Test market description";
    const title = "Test Market";
    const endTimeString = new Date(endTime * 1000).toISOString();
    const startTimeString = new Date().toISOString();
    const resolutionSource = "https://example.com/resolution";
    
    // Derive the market authority PDA
    [marketAuthority, marketAuthorityBump] = await PublicKey.findProgramAddress(
      [Buffer.from("market_authority"), Buffer.from(marketId)],
      program.programId
    );
    
    // Create the market
    await program.methods
      .createMarket(
        marketId,
        options,
        new anchor.BN(endTime),
        bannerUrl,
        description,
        title,
        endTimeString,
        startTimeString,
        resolutionSource
      )
      .accounts({
        state: stateAccount.publicKey,
        market: marketAccount.publicKey,
        admin: provider.wallet.publicKey,
        marketAuthority: marketAuthority,
        systemProgram: SystemProgram.programId,
      })
      .signers([marketAccount])
      .rpc();
    
    // Fetch the newly created market account
    const market = await program.account.market.fetch(marketAccount.publicKey);
    
    // Verify the market was created correctly
    assert.equal(market.id, marketId);
    assert.equal(market.optionA, options[0]);
    assert.equal(market.optionB, options[1]);
    assert.equal(market.resolved, false);
    assert.equal(market.endTime.toNumber(), endTime);
    assert.equal(market.totalValue.toNumber(), 0);
    assert.equal(market.numBettors.toNumber(), 0);
    assert.equal(market.bannerUrl, bannerUrl);
    assert.equal(market.description, description);
    assert.equal(market.title, title);
    assert.equal(market.endTimeString, endTimeString);
    assert.equal(market.startTimeString, startTimeString);
    assert.equal(market.resolutionSource, resolutionSource);
    assert.equal(market.totalOptionA.toNumber(), 0);
    assert.equal(market.totalOptionB.toNumber(), 0);
    assert.equal(market.authority.toString(), marketAuthority.toString());
    assert.equal(market.authorityBump, marketAuthorityBump);
    assert.equal(market.shares.length, 0);
    
    console.log("Market created successfully!");
  });
  
  it("Buys a share in the market", async () => {
    // Parameters for buying a share
    const option = "Yes";
    const amount = new anchor.BN(0.1 * anchor.web3.LAMPORTS_PER_SOL); // 0.1 SOL
    
    // Buy a share
    await program.methods
      .buyShare(
        marketId,
        option,
        amount
      )
      .accounts({
        market: marketAccount.publicKey,
        user: user.publicKey,
        marketAuthority: marketAuthority,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();
    
    // Fetch the updated market account
    const market = await program.account.market.fetch(marketAccount.publicKey);
    
    // Verify the market was updated correctly
    assert.equal(market.totalValue.toNumber(), amount.toNumber());
    assert.equal(market.totalOptionA.toNumber(), amount.toNumber());
    assert.equal(market.totalOptionB.toNumber(), 0);
    assert.equal(market.numBettors.toNumber(), 1);
    assert.equal(market.shares.length, 1);
    
    // Verify the share details
    const share = market.shares[0];
    assert.equal(share.user.toString(), user.publicKey.toString());
    assert.equal(share.option, option);
    assert.equal(share.amount.toNumber(), amount.toNumber());
    assert.equal(share.hasWithdrawn, false);
    
    console.log("Share bought successfully!");
  });
}); 
