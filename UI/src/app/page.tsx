"use client";
import React, { useState, useEffect } from "react";
import ConnectButton from "../components/ConnectButton";
import Image from "next/image";
import { Box, Card, Flex, Grid, Text, Tabs } from "@radix-ui/themes";
import SolcastLogo from "../assets/Solcast.svg";
import bg from "../assets/bg.webp";
import PredictionInput from "../components/PredictionInput";
import MarketInfo from "../components/MarketInfo";
import MarketSelector from "../components/MarketSelector";
import { PublicKey } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import { idl, MarketData } from "../lib/types";

export default function Home() {
  // For demo purposes, we'll use a hardcoded market ID
  // In a real app, this would come from a list of markets or URL parameters
  const [selectedMarketId, setSelectedMarketId] =
    useState<string>("solcast-market-1");
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use the same market address for both components
  const marketAddress = "76czyTVwN2FaydgGbVWghKPGHgHvWxPyKiUW6ktC9XY8";

  const { connection } = useConnection();
  const wallet = useWallet();

  useEffect(() => {
    const fetchMarketData = async () => {
      if (!connection) return;

      try {
        setLoading(true);
        setError(null);

        console.log("Fetching market data from address:", marketAddress);

        // Configure the program ID
        const programId = new PublicKey(
          "7xMuyXtTipSYeTWb4esdnXyVrs63FeDp7RaEjRzvYUQS"
        );

        // Create a read-only provider that doesn't require signing
        const provider = new AnchorProvider(
          connection,
          {
            publicKey: wallet?.publicKey || PublicKey.default,
            signTransaction: () => Promise.reject(),
            signAllTransactions: () => Promise.reject(),
          },
          { commitment: "confirmed" }
        );

        // Create program instance with our manually defined IDL
        const program = new Program(idl, programId, provider);

        // Use the market address
        const marketAccountAddress = new PublicKey(marketAddress);

        console.log(
          "Fetching market account from address:",
          marketAccountAddress.toString()
        );

        // Fetch the market account data
        const marketAccount = await program.account.market.fetch(
          marketAccountAddress
        );
        console.log("Market account data fetched successfully");

        // Map outcome enum to a string
        let outcomeText = "Unresolved";
        if (marketAccount.resolved) {
          // Access the outcome as a property with index signature
          const outcome = marketAccount.outcome as {
            optionA?: boolean;
            optionB?: boolean;
          };
          if (outcome.optionA) {
            outcomeText = marketAccount.optionA as string;
          } else if (outcome.optionB) {
            outcomeText = marketAccount.optionB as string;
          }
        }

        // Convert the data to our frontend format
        const marketDataFormatted: MarketData = {
          id: marketAccount.id as string,
          title: marketAccount.title as string,
          description: marketAccount.description as string,
          optionA: marketAccount.optionA as string,
          optionB: marketAccount.optionB as string,
          endTime: (marketAccount.endTime as BN).toNumber(),
          totalValue: (marketAccount.totalValue as BN).toNumber() / 1e6, // Convert from lamports to USDC
          numBettors: (marketAccount.numBettors as BN).toNumber(),
          resolved: marketAccount.resolved as boolean,
          outcome: outcomeText,
          bannerUrl: marketAccount.bannerUrl as string,
          resolutionSource: marketAccount.resolutionSource as string,
          totalOptionA: marketAccount.totalOptionA
            ? (marketAccount.totalOptionA as BN).toNumber() / 1e6
            : undefined, // Convert from lamports to USDC
          totalOptionB: marketAccount.totalOptionB
            ? (marketAccount.totalOptionB as BN).toNumber() / 1e6
            : undefined, // Convert from lamports to USDC
        };

        console.log("Market data formatted:", marketDataFormatted);
        setMarketData(marketDataFormatted);
      } catch (err: unknown) {
        console.error("Error fetching market data:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(`Failed to load market data: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fetchMarketData();
  }, []);

  return (
    <div className="relative grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family:var(--font-geist-sans)]">
      {/* Background Image */}
      <Image
        src={bg}
        alt="Background"
        fill
        className="object-cover z-[-1]"
        quality={100}
        priority
      />

      <Flex justify="between" width="100%" align="center">
        <Box>
          <Image
            src={SolcastLogo}
            alt="Solcast Logo"
            width={150}
            height={40}
            priority
          />
        </Box>
        <ConnectButton />
      </Flex>

      <Card size="3" style={{ width: "100%", maxWidth: "1200px" }}>
        {/* Market Selector */}
        <Box mb="4">
          <MarketSelector
            selectedMarketId={selectedMarketId}
            onMarketSelect={setSelectedMarketId}
          />
        </Box>

        <Grid columns="1" gap="4" width="100%">
          {/* Left Column */}

          {/* Right Column */}
          <Card size="2">
            <Flex direction="column" gap="4">
              <PredictionInput
                marketAccount={new PublicKey(marketAddress)}
                marketData={marketData}
                loading={loading}
                error={error}
              />
            </Flex>
          </Card>
          <MarketInfo
            marketAddress={marketAddress}
            marketData={marketData}
            loading={loading}
            error={error}
          />
        </Grid>

        {/* Bottom Section */}
        <Box mt="4">
          <Tabs.Root defaultValue="shares">
            <Tabs.List>
              <Tabs.Trigger value="shares">Shares</Tabs.Trigger>
              <Tabs.Trigger value="activity">Activity</Tabs.Trigger>
            </Tabs.List>
          </Tabs.Root>
          <Box style={{ height: "200px" }}></Box>
        </Box>
      </Card>
    </div>
  );
}
