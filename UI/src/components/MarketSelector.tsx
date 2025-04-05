import React, { useState, useEffect } from "react";
import { Box, Card, Flex, Text, Select } from "@radix-ui/themes";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { idl } from "../lib/types";

interface MarketSelectorProps {
  onMarketSelect: (marketId: string) => void;
  selectedMarketId: string;
}

interface MarketListItem {
  id: string;
  title: string;
}

export default function MarketSelector({
  onMarketSelect,
  selectedMarketId,
}: MarketSelectorProps) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [markets, setMarkets] = useState<MarketListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!wallet.publicKey) {
      setLoading(false);
      return;
    }

    const fetchMarkets = async () => {
      try {
        setLoading(true);

        // Create provider and program
        const provider = new AnchorProvider(connection, wallet as any, {});

        const program = new Program(
          idl,
          new PublicKey("7xMuyXtTipSYeTWb4esdnXyVrs63FeDp7RaEjRzvYUQS"),
          provider
        );

        // Find the state account PDA
        const [statePda] = PublicKey.findProgramAddressSync(
          [Buffer.from("state")],
          new PublicKey("7xMuyXtTipSYeTWb4esdnXyVrs63FeDp7RaEjRzvYUQS")
        );

        // Call the get_all_markets query function
        // For query functions, we need to use the program's coder to encode the instruction
        // and then use the connection to call the program
        const stateAccount = await program.account.State.fetch(statePda);

        if (!stateAccount) {
          console.log("No state account found");
          setMarkets([]);
          setLoading(false);
          return;
        }

        // Access marketIds safely
        const marketIds = stateAccount.marketIds as string[];

        if (!marketIds || marketIds.length === 0) {
          setMarkets([]);
          setLoading(false);
          return;
        }

        // Fetch all markets
        const marketPromises = marketIds.map(async (marketId: string) => {
          try {
            // Find the market PDA
            const [marketPda] = PublicKey.findProgramAddressSync(
              [Buffer.from("market"), Buffer.from(marketId)],
              new PublicKey("7xMuyXtTipSYeTWb4esdnXyVrs63FeDp7RaEjRzvYUQS")
            );

            // Fetch the market account
            const marketAccount = await program.account.Market.fetch(marketPda);

            return {
              id: marketId,
              title: marketAccount.title,
            };
          } catch (err) {
            console.error(`Error fetching market ${marketId}:`, err);
            return null;
          }
        });

        const marketResults = await Promise.all(marketPromises);
        const validMarkets = marketResults.filter(
          (market): market is MarketListItem => market !== null
        );

        setMarkets(validMarkets);
      } catch (err) {
        console.error("Error fetching markets:", err);
        setError("Failed to fetch markets");
      } finally {
        setLoading(false);
      }
    };

    fetchMarkets();
  }, [connection, wallet]);

  if (loading) {
    return (
      <Card size="2">
        <Flex direction="column" gap="3" p="4">
          <Text>Loading markets...</Text>
        </Flex>
      </Card>
    );
  }

  if (error) {
    return (
      <Card size="2">
        <Flex direction="column" gap="3" p="4">
          <Text color="red">{error}</Text>
        </Flex>
      </Card>
    );
  }

  if (markets.length === 0) {
    return (
      <Card size="2">
        <Flex direction="column" gap="3" p="4">
          <Text>No markets available</Text>
        </Flex>
      </Card>
    );
  }

  return (
    <Card size="2">
      <Flex direction="column" gap="3" p="4">
        <Text weight="bold">Select Market</Text>
        <Select.Root value={selectedMarketId} onValueChange={onMarketSelect}>
          <Select.Trigger />
          <Select.Content>
            {markets.map((market) => (
              <Select.Item key={market.id} value={market.id}>
                {market.title}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </Flex>
    </Card>
  );
}
