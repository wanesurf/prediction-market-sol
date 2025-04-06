"use client";

import { Box, Card, Flex, Text, Heading } from "@radix-ui/themes";
import { MarketData, MarketInfoProps } from "../lib/types";

export default function MarketInfo({
  marketId,
  marketAddress,
  marketsMapping = {},
  marketData,
  loading,
  error,
}: MarketInfoProps & {
  marketData?: MarketData | null;
  loading?: boolean;
  error?: string | null;
}) {
  if (loading) {
    return (
      <Card size="2">
        <Flex direction="column" gap="3" p="4">
          <Text>Loading market information...</Text>
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

  if (!marketData) {
    return (
      <Card size="2">
        <Flex direction="column" gap="3" p="4">
          <Text>No market selected</Text>
        </Flex>
      </Card>
    );
  }

  const endDate = new Date(marketData.endTime * 1000);
  const isResolved = marketData.resolved;
  const timeRemaining = isResolved
    ? "Resolved"
    : endDate > new Date()
    ? `Ends in ${Math.ceil(
        (endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )} days`
    : "Ended";

  // Calculate odds percentages if both options have values
  const totalPoolSize =
    (marketData.totalOptionA || 0) + (marketData.totalOptionB || 0);
  const optionAPercentage =
    totalPoolSize > 0
      ? (((marketData.totalOptionA || 0) / totalPoolSize) * 100).toFixed(1)
      : "0";
  const optionBPercentage =
    totalPoolSize > 0
      ? (((marketData.totalOptionB || 0) / totalPoolSize) * 100).toFixed(1)
      : "0";

  return (
    <Card size="2">
      <Flex direction="column" gap="3" p="4">
        <Heading size="4">{marketData.title}</Heading>

        <Box>
          <Text size="2" color="gray">
            {marketData.description}
          </Text>
        </Box>

        <Flex justify="between" align="center">
          <Box>
            <Text weight="bold">Options:</Text>
            <Text>
              {marketData.optionA} / {marketData.optionB}
            </Text>
          </Box>
          <Box>
            <Text weight="bold">Status:</Text>
            <Text>{timeRemaining}</Text>
          </Box>
        </Flex>

        <Flex justify="between" align="center">
          <Box>
            <Text weight="bold">Total Value:</Text>
            <Text>{marketData.totalValue.toFixed(2)} SOL</Text>
          </Box>
          <Box>
            <Text weight="bold">Bettors:</Text>
            <Text>{marketData.numBettors}</Text>
          </Box>
        </Flex>

        {totalPoolSize > 0 && (
          <Box>
            <Text weight="bold">Current Odds:</Text>
            <Flex gap="2">
              <Text>
                {marketData.optionA}: {optionAPercentage}%
              </Text>
              <Text>
                {marketData.optionB}: {optionBPercentage}%
              </Text>
            </Flex>
          </Box>
        )}

        {isResolved && (
          <Box>
            <Text weight="bold">Outcome:</Text>
            <Text>{marketData.outcome}</Text>
          </Box>
        )}

        <Box>
          <Text weight="bold">Resolution Source:</Text>
          <Text>{marketData.resolutionSource}</Text>
        </Box>
      </Flex>
    </Card>
  );
}
