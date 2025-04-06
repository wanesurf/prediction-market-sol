"use client";

import {
  Box,
  Card,
  Flex,
  Text,
  Heading,
  Badge,
  Separator,
} from "@radix-ui/themes";
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
      <Card size="2" style={{ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)" }}>
        <Flex
          direction="column"
          gap="3"
          p="4"
          align="center"
          justify="center"
          style={{ minHeight: "150px" }}
        >
          <Text size="2" color="gray">
            Loading market information...
          </Text>
        </Flex>
      </Card>
    );
  }

  if (error) {
    return (
      <Card size="2" style={{ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)" }}>
        <Flex
          direction="column"
          gap="3"
          p="4"
          align="center"
          justify="center"
          style={{ minHeight: "150px" }}
        >
          <Text size="2" color="red" weight="bold">
            {error}
          </Text>
        </Flex>
      </Card>
    );
  }

  if (!marketData) {
    return (
      <Card size="2" style={{ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)" }}>
        <Flex
          direction="column"
          gap="3"
          p="4"
          align="center"
          justify="center"
          style={{ minHeight: "150px" }}
        >
          <Text size="2" color="gray">
            No market selected
          </Text>
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

  return (
    <Card size="2" style={{ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)" }}>
      <Flex direction="column" gap="4" p={{ initial: "3", sm: "4" }}>
        <Flex
          direction={{ initial: "column", sm: "row" }}
          justify="between"
          align={{ initial: "start", sm: "center" }}
          gap={{ initial: "2", sm: "0" }}
        >
          <Heading size={{ initial: "3", sm: "4" }} style={{ fontWeight: 600 }}>
            {marketData.title}
          </Heading>
          <Badge color={isResolved ? "green" : "blue"} size="2">
            {timeRemaining}
          </Badge>
        </Flex>

        <Box>
          <Text
            size={{ initial: "1", sm: "2" }}
            color="gray"
            style={{ lineHeight: 1.5 }}
          >
            {marketData.description}
          </Text>
        </Box>

        <Separator size="2" />

        <Flex
          direction={{ initial: "column", sm: "row" }}
          justify="between"
          align={{ initial: "start", sm: "center" }}
          gap={{ initial: "4", sm: "0" }}
        >
          <Box>
            <Text size={{ initial: "1", sm: "2" }} weight="bold" color="gray">
              Options
            </Text>
            <Flex gap="2" mt="1">
              <Badge color="green" size="2">
                {marketData.optionA}
              </Badge>
              <Badge color="red" size="2">
                {marketData.optionB}
              </Badge>
            </Flex>
          </Box>
          <Box>
            <Text size={{ initial: "1", sm: "2" }} weight="bold" color="gray">
              Total Value
            </Text>
            <Text size={{ initial: "2", sm: "3" }} weight="bold" mt="1" ml="2">
              {marketData.totalValue.toFixed(2)} SOL
            </Text>
          </Box>
        </Flex>

        <Flex
          direction={{ initial: "column", sm: "row" }}
          justify="between"
          align={{ initial: "start", sm: "center" }}
          gap={{ initial: "4", sm: "0" }}
        >
          <Box>
            <Text size={{ initial: "1", sm: "2" }} weight="bold" color="gray">
              Bettors
            </Text>
            <Text size={{ initial: "2", sm: "3" }} weight="bold" mt="1" ml="2">
              {marketData.numBettors}
            </Text>
          </Box>
          <Box>
            <Text size={{ initial: "1", sm: "2" }} weight="bold" color="gray">
              Resolution Source
            </Text>
            <Text
              size={{ initial: "1", sm: "2" }}
              mt="1"
              ml="2"
              style={{ wordBreak: "break-word" }}
            >
              {marketData.resolutionSource}
            </Text>
          </Box>
        </Flex>

        {isResolved && (
          <Box>
            <Text size={{ initial: "1", sm: "2" }} weight="bold" color="gray">
              Outcome
            </Text>
            <Badge color="green" size="2" mt="1" ml="2">
              {marketData.outcome}
            </Badge>
          </Box>
        )}
      </Flex>
    </Card>
  );
}
