import React from "react";

import up_higher from "../assets/up_higher.gif";
import decide_no from "../assets/decide_no.gif";
import make_decision from "../assets/make_decision.gif";
import solana from "../assets/solana-sol-logo.svg";

import { useEffect, useState, useCallback } from "react";
import { Card, Skeleton } from "@radix-ui/themes";
import { VoteBar } from "./VoteBar";
import { Input } from "./Input";
import { Button } from "./Button";
import {
  useWallet,
  useConnection,
  useAnchorWallet,
} from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import { AnchorProvider, Program, BN, web3 } from "@coral-xyz/anchor";
import { notify } from "../lib/notifications";
import { MarketData } from "../lib/types";
import { idl } from "../lib/types";
// Constants
const SOLCAST_PROGRAM_ID = new PublicKey(
  "7QDrqqkxpti8WN4amvMHmcmZtonYeAzYrmdXefvEx3xJ"
);

export default function PredictionInput({
  marketAccount,
  marketData,
  loading,
  error,
}: {
  marketAccount?: PublicKey;
  marketData?: MarketData | null;
  loading?: boolean;
  error?: string | null;
}) {
  const [tokenPrice, setTokenPrice] = useState(0);
  const [currentGif, setCurrentGif] = useState(make_decision);
  const [amount, setAmount] = useState("");
  const [showEstimatedWinnings, setShowEstimatedWinnings] = useState(false);
  const [option, setOption] = useState<"Yes" | "No">("Yes");
  const [isLoading, setIsLoading] = useState(false);
  const [odds, setOdds] = useState<{ oddsA: number; oddsB: number }>({
    oddsA: 0,
    oddsB: 0,
  });
  const [potentialWinnings, setPotentialWinnings] = useState<{
    yes: number;
    no: number;
  }>({ yes: 0, no: 0 });

  const { publicKey, connected, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const wallet = useWallet();

  // Calculate odds when market data changes
  useEffect(() => {
    if (marketData) {
      const totalA = marketData.totalOptionA || 0;
      const totalB = marketData.totalOptionB || 0;

      const calculatedOdds = {
        oddsA: totalB > 0 && totalA > 0 ? totalB / totalA : 0,
        oddsB: totalA > 0 && totalB > 0 ? totalA / totalB : 0,
      };

      setOdds(calculatedOdds);

      // Update potential winnings if amount is set
      if (amount && !isNaN(Number(amount)) && Number(amount) > 0) {
        calculatePotentialWinnings(calculatedOdds, Number(amount));
      }
    }
  }, [marketData, amount]);

  // Fetch market data
  const fetchMarketData = useCallback(async () => {
    if (!connection || !marketAccount) {
      console.log(
        "Cannot fetch market data: connection or marketAccount is missing"
      );
      return;
    }

    try {
      setIsLoading(true);
      console.log(
        "Fetching market data for account:",
        marketAccount.toString()
      );

      const provider = new AnchorProvider(connection, wallet as any, {
        commitment: "confirmed",
      });

      const program = new Program(idl, SOLCAST_PROGRAM_ID, provider);
      if (!program) {
        console.log("Failed to initialize program");
        return;
      }

      // Fetch market data
      console.log("Fetching market account data...");
      const market = await program.account.market.fetch(marketAccount);
      console.log("Market account data fetched successfully:", market);

      // Extract relevant data for odds calculation
      const totalA = market.totalOptionA
        ? (market.totalOptionA as any).toNumber()
        : 0;
      const totalB = market.totalOptionB
        ? (market.totalOptionB as any).toNumber()
        : 0;

      console.log("Total option A:", totalA);
      console.log("Total option B:", totalB);

      const calculatedOdds = {
        oddsA: totalB > 0 && totalA > 0 ? totalB / totalA : 0,
        oddsB: totalA > 0 && totalB > 0 ? totalA / totalB : 0,
      };

      console.log("Calculated odds:", calculatedOdds);
      setOdds(calculatedOdds);

      // Update potential winnings if amount is set
      if (amount && !isNaN(Number(amount)) && Number(amount) > 0) {
        calculatePotentialWinnings(calculatedOdds, Number(amount));
      }
    } catch (error) {
      console.error("Failed to fetch market data:", error);
      notify({ type: "error", message: "Failed to fetch market data" });
    } finally {
      setIsLoading(false);
    }
  }, [connection, marketAccount, amount]);

  // Calculate potential winnings
  const calculatePotentialWinnings = (
    currentOdds: { oddsA: number; oddsB: number },
    amountValue: number
  ) => {
    if (isNaN(amountValue) || amountValue <= 0) {
      setPotentialWinnings({ yes: 0, no: 0 });
      return;
    }

    // Apply 5% commission rate
    const COMMISSION_RATE = 0.05;

    // Calculate potential winnings for YES
    const yesWinnings =
      amountValue + amountValue * currentOdds.oddsA * (1 - COMMISSION_RATE);

    // Calculate potential winnings for NO
    const noWinnings =
      amountValue + amountValue * currentOdds.oddsB * (1 - COMMISSION_RATE);

    setPotentialWinnings({
      yes: yesWinnings,
      no: noWinnings,
    });
  };

  const buyShares = async () => {
    // Initial validation checks
    if (!publicKey || !connected) {
      notify({ type: "error", message: "Please connect your wallet first" });
      return;
    }

    if (!marketAccount || !(marketAccount instanceof PublicKey)) {
      notify({ type: "error", message: "Invalid market account" });
      return;
    }

    if (!marketData) {
      notify({ type: "error", message: "Market data not available" });
      return;
    }

    // Validate market ID and options
    if (!marketData.id || typeof marketData.id !== "string") {
      notify({ type: "error", message: "Invalid market ID" });
      return;
    }

    if (
      !marketData.optionA ||
      typeof marketData.optionA !== "string" ||
      !marketData.optionB ||
      typeof marketData.optionB !== "string"
    ) {
      notify({ type: "error", message: "Invalid market options" });
      return;
    }

    // Validate option and amount
    if (option !== "Yes" && option !== "No") {
      notify({ type: "error", message: "Invalid option selected" });
      return;
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      notify({ type: "error", message: "Please enter a valid amount" });
      return;
    }

    // Create a custom wallet adapter to fix the type issue
    const walletAdapter = {
      publicKey: wallet.publicKey || PublicKey.default,
      signTransaction: wallet.signTransaction || (() => Promise.reject()),
      signAllTransactions:
        wallet.signAllTransactions || (() => Promise.reject()),
    };

    const provider = new AnchorProvider(connection, walletAdapter, {
      commitment: "confirmed",
    });

    try {
      setIsLoading(true);
      const program = new Program(idl, SOLCAST_PROGRAM_ID, provider);
      if (!program) {
        notify({ type: "error", message: "Failed to initialize program" });
        return;
      }

      // Convert amount to lamports (SOL * 10^9)
      const amountLamports = Math.floor(parseFloat(amount) * 1_000_000_000);

      // Fetch the market account data to get the correct market ID
      const marketAccountData = await program.account.market.fetch(
        marketAccount
      );
      const marketId = marketAccountData.id as string;

      // Get the market authority PDA
      const [marketAuthority, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from("market_authority"), Buffer.from(marketId as string)],
        program.programId
      );

      // Detailed logging of market account data
      console.log("Market Account Data:", {
        id: marketId,
        authority: marketAuthority.toString(),
        authorityBump: bump,
        optionA: marketAccountData.optionA,
        optionB: marketAccountData.optionB,
        marketAuthority: marketAccountData.authority?.toString(),
        isMatchingAuthority: marketAuthority.equals(
          marketAccountData.authority as PublicKey
        ),
      });

      // Determine which option the user is selecting
      const selectedOption =
        option === "Yes" ? marketData.optionA : marketData.optionB;

      // Additional debug: Check if the option values match exactly
      console.log("Option comparison:", {
        selectedOption,
        marketOptionA: marketData.optionA,
        marketOptionB: marketData.optionB,
        contractOptionA: marketAccountData.optionA,
        contractOptionB: marketAccountData.optionB,
        // Check for exact matches
        optionAMatch: marketData.optionA === marketAccountData.optionA,
        optionBMatch: marketData.optionB === marketAccountData.optionB,
      });

      // Explicit system program ID
      const SYSTEM_PROGRAM_ID = new PublicKey(
        "11111111111111111111111111111111"
      );

      // Comprehensive logging of transaction details
      console.log("Transaction Preparation Details:", {
        marketId,
        selectedOption,
        amountLamports,
        marketAccount: marketAccount.toString(),
        publicKey: publicKey.toString(),
        systemProgramId: SYSTEM_PROGRAM_ID.toString(),
        marketAuthority: marketAuthority.toString(),
      });

      // Create the transaction
      const ix = await program.methods
        .buyShare(marketId, selectedOption, new BN(amountLamports))
        .accounts({
          market: marketAccount,
          user: publicKey,
          marketAuthority: marketAuthority,
          systemProgram: SYSTEM_PROGRAM_ID,
        })
        .instruction();

      const transaction = new Transaction().add(ix);

      try {
        const signature = await sendTransaction(transaction, connection);
        console.log("Transaction successful:", signature);

        // Notify user of successful transaction
        notify({
          type: "success",
          message: `Successfully placed ${option} prediction of ${amount} SOL!`,
          txid: signature,
        });

        // Refresh market data
        fetchMarketData();
      } catch (error: any) {
        console.error("Transaction error details:", error);

        // More detailed error handling with stringified error
        console.error("Full error object:", JSON.stringify(error, null, 2));

        // Check for specific error types
        if (error.message && error.message.includes("InvalidMarketAuthority")) {
          notify({
            type: "error",
            message:
              "Invalid market authority. Please try again or contact support.",
          });
        } else if (error.message && error.message.includes("InvalidOption")) {
          notify({
            type: "error",
            message: "Invalid option selected. Please try again.",
          });
        } else {
          notify({
            type: "error",
            message: `Transaction failed: ${error.message || "Unknown error"}`,
          });
        }
      }
    } catch (error) {
      // Comprehensive error logging
      console.error("Full buy shares error:", error);

      if (error instanceof Error) {
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }

      // Provide user-friendly error notification
      notify({
        type: "error",
        message: `Failed to place prediction: ${
          error instanceof Error ? error.message : JSON.stringify(error)
        }`,
      });
    } finally {
      // Ensure loading state is reset
      setIsLoading(false);
    }
  };

  // Update the option selection handlers
  const handleOptionSelect = (selectedOption: "Yes" | "No") => {
    setOption(selectedOption);
    setCurrentGif(selectedOption === "Yes" ? up_higher : decide_no);
  };

  // Withdraw winnings
  const withdrawWinnings = async () => {
    if (!publicKey || !connected || !marketData) {
      notify({ type: "error", message: "Please connect your wallet first" });
      return;
    }

    if (!marketAccount) {
      notify({ type: "error", message: "No market selected" });
      return;
    }

    // Check if market is resolved
    if (!marketData.resolved) {
      notify({ type: "error", message: "Market is not resolved yet" });
      return;
    }

    try {
      setIsLoading(true);

      // Create a custom wallet adapter to fix the type issue
      const walletAdapter = {
        publicKey: wallet.publicKey || PublicKey.default,
        signTransaction: wallet.signTransaction || (() => Promise.reject()),
        signAllTransactions:
          wallet.signAllTransactions || (() => Promise.reject()),
      };

      // Create a provider
      const provider = new AnchorProvider(connection, walletAdapter, {
        commitment: "confirmed",
      });

      const program = new Program(idl, SOLCAST_PROGRAM_ID, provider);
      if (!program) return;

      // Fetch the market account data to get the market authority
      const marketAccountData = await program.account.market.fetch(
        marketAccount
      );

      // Get the market authority PDA
      const [marketAuthority, bump] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("market_authority"),
          Buffer.from(marketAccountData.id as string),
        ],
        program.programId
      );

      // Log the market authority for debugging
      console.log("Withdraw - Market Authority:", {
        id: marketAccountData.id,
        authority: marketAuthority.toString(),
        authorityBump: bump,
        marketAuthority: marketAccountData.authority?.toString(),
      });

      // Create the transaction
      const ix = await program.methods
        .withdraw(marketAccountData.id)
        .accounts({
          market: marketAccount,
          user: publicKey,
          marketAuthority: marketAuthority,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      // Create and send transaction
      const transaction = new Transaction().add(ix);
      const { blockhash } = await connection.getRecentBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      try {
        const signature = await sendTransaction(transaction, connection);
        await connection.confirmTransaction(signature, "confirmed");

        notify({
          type: "success",
          message: "Successfully withdrew SOL winnings!",
          txid: signature,
        });

        // Refresh market data
        fetchMarketData();
      } catch (error: any) {
        console.error("Withdraw transaction error details:", error);

        // Check for specific error types
        if (error.message && error.message.includes("InvalidMarketAuthority")) {
          notify({
            type: "error",
            message:
              "Invalid market authority. Please try again or contact support.",
          });
        } else if (error.message && error.message.includes("NoWinningShares")) {
          notify({
            type: "error",
            message: "You don't have any winning shares for this market.",
          });
        } else if (
          error.message &&
          error.message.includes("AlreadyWithdrawn")
        ) {
          notify({
            type: "error",
            message: "You've already withdrawn your winnings from this market.",
          });
        } else {
          notify({
            type: "error",
            message: `Withdrawal failed: ${error.message || "Unknown error"}`,
          });
        }
      }
    } catch (error: any) {
      console.error("Failed to withdraw:", error);
      notify({
        type: "error",
        message: "Failed to withdraw winnings",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch SOL price
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
        );
        const data = await response.json();
        setTokenPrice(data.solana.usd);
      } catch (error) {
        console.error("Failed to fetch price:", error);
        setTokenPrice(0);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  // Fetch market data on mount and periodically
  useEffect(() => {
    if (marketAccount) {
      fetchMarketData();

      const interval = setInterval(fetchMarketData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [fetchMarketData, marketAccount]);

  const handleAmountChange = (value: string) => {
    // Only allow numbers and at most one decimal point
    const sanitizedValue = value.replace(/[^\d.]/g, "");
    const parts = sanitizedValue.split(".");
    const cleanValue = parts[0] + (parts.length > 1 ? "." + parts[1] : "");
    const finalValue = cleanValue.replace(/^0+(?=\d)/, "") || "0";
    setAmount(finalValue);
  };

  // Calculate yes/no percentages for display
  const yesPercentage =
    marketData &&
    typeof marketData.totalOptionA === "number" &&
    typeof marketData.totalOptionB === "number" &&
    marketData.totalOptionA + marketData.totalOptionB > 0
      ? (marketData.totalOptionA /
          (marketData.totalOptionA + marketData.totalOptionB)) *
        100
      : 50;

  const noPercentage = 100 - yesPercentage;

  // If no market is selected, show a message
  if (!marketAccount && !loading) {
    return (
      <Card className="shadow-2xl w-full h-full flex flex-col items-center justify-center p-8">
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold text-white">Select a Market</h2>
          <p className="text-white/70 mt-2">
            Choose a market from the dropdown above to start placing predictions
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="shadow-2xl w-full h-full flex flex-col items-center justify-start">
      {marketData && (
        <div className="w-full text-center mb-4">
          <h2 className="text-xl font-bold text-white">{marketData.title}</h2>
        </div>
      )}

      <div className="flex justify-center w-full">
        <img
          // @ts-ignore
          src={currentGif.src}
          alt="Prediction Market"
          className="rounded-lg w-24 h-24 sm:w-32 sm:h-32"
        />
      </div>

      {(isLoading || loading) && !marketData ? (
        <div className="w-full my-20">
          <Skeleton className="w-full h-12" />
          <Skeleton className="w-full h-8 mt-2" />
        </div>
      ) : (
        <div className="space-y-4 my-10 w-full">
          <VoteBar yesPercentage={yesPercentage} noPercentage={noPercentage} />

          {marketData && (
            <div className="flex justify-between text-white/70 text-sm px-1">
              <div>YES: {marketData.totalOptionA?.toFixed(2) || 0} SOL</div>
              <div>NO: {marketData.totalOptionB?.toFixed(2) || 0} SOL</div>
            </div>
          )}
        </div>
      )}

      {/* Only show option selection if market is not resolved */}
      {marketData && !marketData.resolved && (
        <div className="grid grid-cols-2 gap-4 w-full">
          <Button
            className={`h-12 text-sm font-semibold ${
              option === "Yes"
                ? "bg-green-500 hover:bg-green-600 text-white"
                : "bg-green-500/20 hover:bg-green-600/30 text-white"
            }`}
            onClick={() => {
              setOption("Yes");
              setCurrentGif(up_higher);
            }}
          >
            {marketData.optionA || "Yes"}
          </Button>
          <Button
            className={`h-12 text-sm font-semibold ${
              option === "No"
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-red-500/20 hover:bg-red-600/30 text-white"
            }`}
            onClick={() => {
              setOption("No");
              setCurrentGif(decide_no);
            }}
          >
            {marketData.optionB || "No"}
          </Button>
        </div>
      )}

      {/* Show resolved status if market is resolved */}
      {marketData && marketData.resolved && (
        <div className="w-full text-center mb-6">
          <div className="bg-indigo-600/30 rounded-lg p-3">
            <p className="text-white font-medium">
              Market Resolved: {marketData.outcome}
            </p>
          </div>

          {connected && marketData.resolved && (
            <Button
              className="w-full h-12 mt-4 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white transition-all duration-300"
              onClick={withdrawWinnings}
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Withdraw SOL Winnings"}
            </Button>
          )}
        </div>
      )}

      {/* Show Connect Wallet button if wallet is not connected */}
      {!connected && (
        <div className="w-full mt-6">
          <WalletMultiButton className="w-full h-12 text-sm font-semibold bg-violet-600 hover:bg-violet-800 text-white transition-all duration-300 flex items-center justify-center" />
        </div>
      )}

      {/* Show amount input and place prediction button only if wallet is connected and market not resolved */}
      {connected && marketData && !marketData.resolved && (
        <div className="space-y-4 w-full mt-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">
              Amount (SOL)
            </label>
            <div className="relative">
              <img
                // @ts-ignore
                src={solana.src}
                alt="SOL"
                className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50"
              />
              <Input
                type="tel"
                inputMode="decimal"
                placeholder="Enter SOL amount"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="pl-10 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="text-sm text-white/60">
              {tokenPrice > 0 && (
                <>≈ ${(Number(amount) * tokenPrice).toFixed(2)} USD</>
              )}
            </div>
          </div>

          {/* Add calculated potential winnings display */}
          {amount && Number(amount) > 0 && (
            <div className="mt-2 p-3 bg-white/5 rounded-lg">
              <div className="flex items-center justify-between w-full text-sm text-white/80 mb-2">
                <span className="font-semibold">Potential Winnings</span>
                <div className="relative group">
                  <span className="text-xs text-white/60 cursor-help">
                    Based on current market odds
                  </span>
                  <div className="absolute right-0 bottom-full mb-2 w-64 p-2 bg-gray-800 text-xs text-white rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                    <p>Potential winnings are calculated based on:</p>
                    <ul className="list-disc pl-2 mt-1">
                      <li>Current market odds</li>
                      <li>Your bet amount</li>
                      <li>5% platform commission</li>
                    </ul>
                    <p className="mt-1">
                      Higher odds = higher potential returns
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div
                  className={`p-2 rounded-lg ${
                    option === "Yes" ? "bg-green-500/20" : "bg-white/5"
                  } ${
                    potentialWinnings.yes > potentialWinnings.no
                      ? "border border-green-500/50"
                      : ""
                  }`}
                >
                  <div className="text-green-500 font-semibold flex items-center">
                    YES: {potentialWinnings.yes.toFixed(2)} SOL
                    {potentialWinnings.yes > potentialWinnings.no && (
                      <span className="ml-1 text-xs bg-green-500/30 px-1 rounded">
                        Best Return
                      </span>
                    )}
                  </div>
                  {tokenPrice > 0 && (
                    <div className="text-sm text-white/60">
                      ≈ ${(potentialWinnings.yes * tokenPrice).toFixed(2)} USD
                    </div>
                  )}
                  <div className="text-xs text-white/60 mt-1">
                    Return:{" "}
                    {(
                      (potentialWinnings.yes / Number(amount) - 1) *
                      100
                    ).toFixed(1)}
                    %
                  </div>
                </div>
                <div
                  className={`p-2 rounded-lg ${
                    option === "No" ? "bg-red-500/20" : "bg-white/5"
                  } ${
                    potentialWinnings.no > potentialWinnings.yes
                      ? "border border-red-500/50"
                      : ""
                  }`}
                >
                  <div className="text-red-500 font-semibold flex items-center">
                    NO: {potentialWinnings.no.toFixed(2)} SOL
                    {potentialWinnings.no > potentialWinnings.yes && (
                      <span className="ml-1 text-xs bg-red-500/30 px-1 rounded">
                        Best Return
                      </span>
                    )}
                  </div>
                  {tokenPrice > 0 && (
                    <div className="text-sm text-white/60">
                      ≈ ${(potentialWinnings.no * tokenPrice).toFixed(2)} USD
                    </div>
                  )}
                  <div className="text-xs text-white/60 mt-1">
                    Return:{" "}
                    {(
                      (potentialWinnings.no / Number(amount) - 1) *
                      100
                    ).toFixed(1)}
                    %
                  </div>
                </div>
              </div>

              <div className="mt-2 text-xs text-white/60 flex items-center justify-between">
                <p>
                  Best potential return:{" "}
                  {potentialWinnings.yes > potentialWinnings.no ? "YES" : "NO"}
                </p>
                <p
                  className={`${
                    potentialWinnings.yes > potentialWinnings.no
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {Math.max(
                    (potentialWinnings.yes / Number(amount) - 1) * 100,
                    (potentialWinnings.no / Number(amount) - 1) * 100
                  ).toFixed(1)}
                  %
                </p>
              </div>
            </div>
          )}

          {/* Place prediction button */}
          <Button
            className="w-full h-12 text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-all duration-300"
            onClick={buyShares}
            disabled={isLoading || !amount || Number(amount) <= 0}
          >
            {isLoading ? "Processing..." : `Place ${option} Prediction`}
          </Button>
        </div>
      )}

      {/* Market info */}
      {marketData && (
        <div className="mt-6 w-full p-4 bg-white/5 rounded-lg">
          <p className="text-sm text-white/70 mb-4">{marketData.description}</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-white/60">End Time:</span>
              <p className="text-white">
                {new Date(marketData.endTime * 1000).toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-white/60">Resolution Source:</span>
              <p className="text-white">{marketData.resolutionSource}</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
