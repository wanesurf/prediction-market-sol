import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Solcast } from "../target/types/solcast";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import fs from "fs";
import path from "path";

async function main() {
  // Configure the client to use devnet
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.solcast as Program<Solcast>;
  
  console.log("Deploying to devnet...");
  
  // Generate a new keypair for the state account
  const stateAccount = anchor.web3.Keypair.generate();
  console.log("State account:", stateAccount.publicKey.toString());
  
  // Initialize the contract
  console.log("Initializing the Solcast contract...");
  await program.methods
    .initialize()
    .accounts({
      state: stateAccount.publicKey,
      admin: provider.wallet.publicKey,
      // @ts-ignore
      systemProgram: SystemProgram.programId,
    })
    .signers([stateAccount])
    .rpc();
  
  console.log("Solcast contract initialized successfully!");
  
  // Save the state account to a file for future use
  const stateAccountPath = path.join(__dirname, "state-account.json");
  fs.writeFileSync(stateAccountPath, JSON.stringify(Array.from(stateAccount.secretKey)));
  console.log("State account saved to:", stateAccountPath);
  
  // Generate a new keypair for the market account
  const marketAccount = anchor.web3.Keypair.generate();
  console.log("Market account:", marketAccount.publicKey.toString());
  
  // Generate keypairs for token mints
  const tokenAMint = anchor.web3.Keypair.generate();
  const tokenBMint = anchor.web3.Keypair.generate();
  console.log("Token A mint:", tokenAMint.publicKey.toString());
  console.log("Token B mint:", tokenBMint.publicKey.toString());
  
  // Market parameters
  const marketId = "solcast-market-1";
  const options = ["Yes", "No"];
  const endTime = Math.floor(Date.now() / 1000) + 86400 * 7; // 7 days from now
  const buyToken = new PublicKey("So11111111111111111111111111111111111111112"); // SOL token
  const bannerUrl = "https://example.com/banner.jpg";
  const description = "First Solcast prediction market";
  const title = "Will Solana reach $200 by the end of 2024?";
  const endTimeString = new Date(endTime * 1000).toISOString();
  const startTimeString = new Date().toISOString();
  const resolutionSource = "https://coingecko.com/en/coins/solana";
  
  // Derive the market authority PDA
  const [marketAuthority, marketAuthorityBump] = await PublicKey.findProgramAddress(
    [Buffer.from("market_authority"), Buffer.from(marketId)],
    program.programId
  );
  console.log("Market authority:", marketAuthority.toString());
  
  // Create the market
  console.log("Creating the market...");
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
      // @ts-ignore
      marketAuthority: marketAuthority,
      // @ts-ignore
      tokenAMint: tokenAMint.publicKey,
      // @ts-ignore
      tokenBMint: tokenBMint.publicKey,
      // @ts-ignore
      systemProgram: SystemProgram.programId,
      // @ts-ignore
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .signers([marketAccount, tokenAMint, tokenBMint])
    .rpc();
  
  console.log("Market created successfully!");
  
  // Save the market account and token mints to files for future use
  const marketAccountPath = path.join(__dirname, "market-account.json");
  const tokenAMintPath = path.join(__dirname, "token-a-mint.json");
  const tokenBMintPath = path.join(__dirname, "token-b-mint.json");
  
  fs.writeFileSync(marketAccountPath, JSON.stringify(Array.from(marketAccount.secretKey)));
  fs.writeFileSync(tokenAMintPath, JSON.stringify(Array.from(tokenAMint.secretKey)));
  fs.writeFileSync(tokenBMintPath, JSON.stringify(Array.from(tokenBMint.secretKey)));
  
  console.log("Market account saved to:", marketAccountPath);
  console.log("Token A mint saved to:", tokenAMintPath);
  console.log("Token B mint saved to:", tokenBMintPath);
  
  // Fetch and display the market details
  const market = await program.account.market.fetch(marketAccount.publicKey);
  console.log("Market details:", market);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
); 
