import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Solcast } from "../target/types/solcast";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import assert from "assert";

describe("solcast", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.solcast as Program<Solcast>;
  
  // Store the state account for future tests
  let stateAccount: anchor.web3.Keypair;
  
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
    const marketAccount = anchor.web3.Keypair.generate();
    
    // Generate keypairs for token mints
    const tokenAMint = anchor.web3.Keypair.generate();
    const tokenBMint = anchor.web3.Keypair.generate();
    
    // Market parameters
    const marketId = "test-market-1";
    const options = ["Yes", "No"];
    const endTime = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now
    const buyToken = new PublicKey("11111111111111111111111111111111"); // Replace with actual token mint
    const bannerUrl = "https://example.com/banner.jpg";
    const description = "Test market description";
    const title = "Test Market";
    const endTimeString = new Date(endTime * 1000).toISOString();
    const startTimeString = new Date().toISOString();
    const resolutionSource = "https://example.com/resolution";
    
    // Derive the market authority PDA
    const [marketAuthority, marketAuthorityBump] = await PublicKey.findProgramAddress(
      [Buffer.from("market_authority"), Buffer.from(marketId)],
      program.programId
    );
    
    // Create the market
    await program.methods
      .createMarket(
        marketId,
        options,
        new anchor.BN(endTime),
        buyToken,
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
        tokenAMint: tokenAMint.publicKey,
        tokenBMint: tokenBMint.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([marketAccount, tokenAMint, tokenBMint])
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
    assert.equal(market.buyToken.toString(), buyToken.toString());
    assert.equal(market.tokenAMint.toString(), tokenAMint.publicKey.toString());
    assert.equal(market.tokenBMint.toString(), tokenBMint.publicKey.toString());
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

    console.log("Market created successfully!", market);
    
    // Fetch the state account again to verify it was updated
    const updatedState = await program.account.state.fetch(stateAccount.publicKey);
    assert.equal(updatedState.marketIds.length, 1);
    assert.equal(updatedState.marketIds[0], marketId);
    assert.equal(updatedState.marketIdCounter.toNumber(), 1);
    assert.equal(updatedState.lastMarketId.toNumber(), 1);
    
    console.log("Market created successfully!");
  });
}); 
