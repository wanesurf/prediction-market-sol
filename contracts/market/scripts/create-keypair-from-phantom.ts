// scripts/create-keypair-from-phantom.ts
import * as fs from "fs";
import * as path from "path";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import * as os from "os";

// Get private key from command line argument
const privateKeyBase58 = process.argv[2];

if (!privateKeyBase58) {
  console.error("Please provide your private key as an argument");
  console.error(
    "Example: ts-node create-keypair-from-phantom.ts <your-private-key>"
  );
  process.exit(1);
}

try {
  // Decode the base58 private key from Phantom
  const privateKeyBytes = bs58.decode(privateKeyBase58);

  // Create a keypair from the private key
  const keypair = Keypair.fromSecretKey(privateKeyBytes);

  // Verify the keypair by logging the public key
  console.log("Public key:", keypair.publicKey.toString());

  // Create the .config/solana directory if it doesn't exist
  const homeDir = os.homedir();
  const solanaConfigDir = path.join(homeDir, ".config", "solana");

  if (!fs.existsSync(solanaConfigDir)) {
    fs.mkdirSync(solanaConfigDir, { recursive: true });
  }

  // Save the keypair to a file
  const keyfilePath = path.join(solanaConfigDir, "id.json");
  fs.writeFileSync(keyfilePath, JSON.stringify(Array.from(keypair.secretKey)));

  console.log(`Keypair saved to ${keyfilePath}`);
  console.log("This keypair can now be used with Anchor CLI commands");
} catch (error) {
  console.error(
    "Error creating keypair:",
    error instanceof Error ? error.message : String(error)
  );
  process.exit(1);
}
