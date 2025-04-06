import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Solcast } from "../target/types/solcast";
import { PublicKey, SystemProgram, clusterApiUrl, Keypair } from "@solana/web3.js";
import fs from "fs";
import path from "path";

async function main() {
  // Parse command-line arguments
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log("Usage: ts-node close-market.ts <marketId> <winningOption>");
    console.log("Example: ts-node close-market.ts solcast-market-8 Yes");
    process.exit(1);
  }
  
  const [marketId, winningOption] = args;
  
  // Set ANCHOR_PROVIDER_URL to devnet if not defined
  if (!process.env.ANCHOR_PROVIDER_URL) {
    process.env.ANCHOR_PROVIDER_URL = clusterApiUrl("devnet");
    console.log("Setting ANCHOR_PROVIDER_URL to devnet:", process.env.ANCHOR_PROVIDER_URL);
  }
  
  // Use a specific wallet keypair that has SOL
  // This is the same keypair used in the deploy script
  const walletKeypairPath = path.join(__dirname, "admin-keypair.json");
  let walletKeypair;
  
  try {
    // Try to load the wallet from the file
    const walletSecretKey = JSON.parse(fs.readFileSync(walletKeypairPath, 'utf-8'));
    walletKeypair = Keypair.fromSecretKey(new Uint8Array(walletSecretKey));
    console.log("Loaded wallet keypair:", walletKeypair.publicKey.toString());
  } catch (error) {
    console.log("Admin keypair file not found, generating a new one...");
    // Generate a new keypair for the wallet
    walletKeypair = Keypair.generate();
    console.log("Generated new wallet keypair:", walletKeypair.publicKey.toString());
    
    // Save the wallet to a file
    fs.writeFileSync(walletKeypairPath, JSON.stringify(Array.from(walletKeypair.secretKey)));
    console.log("Wallet keypair saved to:", walletKeypairPath);
    
    console.log("WARNING: This new wallet has no SOL. You need to fund it with SOL from a faucet.");
    console.log("You can get SOL from the devnet faucet: https://solfaucet.com/");
  }
  
  // Set the ANCHOR_WALLET environment variable to the path of the wallet file
  process.env.ANCHOR_WALLET = walletKeypairPath;
  console.log("Setting ANCHOR_WALLET to:", walletKeypairPath);
  
  // Configure the client to use devnet
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.solcast as Program<Solcast>;
  
  console.log("Closing market on devnet...");
  
  // Load the state account from file
  const stateAccountPath = path.join(__dirname, "state-account.json");
  let stateAccountKeypair;
  
  try {
    const stateAccountSecretKey = JSON.parse(fs.readFileSync(stateAccountPath, 'utf-8'));
    stateAccountKeypair = anchor.web3.Keypair.fromSecretKey(new Uint8Array(stateAccountSecretKey));
    console.log("State account:", stateAccountKeypair.publicKey.toString());
  } catch (error) {
    console.error("Error loading state account:", error);
    process.exit(1);
  }
  
  // Find the market account
  let marketAccountKeypair;
  const marketAccountPath = path.join(__dirname, "market-account.json");
  
  try {
    const marketAccountSecretKey = JSON.parse(fs.readFileSync(marketAccountPath, 'utf-8'));
    marketAccountKeypair = anchor.web3.Keypair.fromSecretKey(new Uint8Array(marketAccountSecretKey));
    console.log("Market account:", marketAccountKeypair.publicKey.toString());
  } catch (error) {
    console.error("Error loading market account:", error);
    process.exit(1);
  }
  
  // Resolve the market
  console.log(`Resolving market ${marketId} with winning option: ${winningOption}`);
  try {
    await program.methods
      .resolve(marketId, winningOption)
      .accounts({
        state: stateAccountKeypair.publicKey,
        market: marketAccountKeypair.publicKey,
        admin: provider.wallet.publicKey,
      })
      .rpc();
    
    console.log("Market resolved successfully!");
    
    // Fetch and display the updated market details
    const market = await program.account.market.fetch(marketAccountKeypair.publicKey);
    console.log("Updated market details:", market);
  } catch (error) {
    console.error("Error resolving market:", error);
    process.exit(1);
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
); 
