import ConnectButton from "@/components/ConnectButton";
import Image from "next/image";
import { Box, Card, Flex, Grid, Text, Tabs } from "@radix-ui/themes";
import SolcastLogo from "@/assets/Solcast.svg";
import bg from "@/assets/bg.webp";
import PredictionInput from "@/components/PredictionInput";

export default function Home() {
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
        <Grid columns="2" gap="4" width="100%">
          {/* Left Column */}
          <Card size="2">
            <Tabs.Root defaultValue="volume">
              <Tabs.List>
                <Tabs.Trigger value="volume">Volume</Tabs.Trigger>
                <Tabs.Trigger value="percentage">Percentage</Tabs.Trigger>
              </Tabs.List>
            </Tabs.Root>
            {/* Chart area would go here */}
            <Box style={{ height: "400px" }}></Box>
          </Card>

          {/* Right Column */}
          <Card size="2">
            <Flex direction="column" gap="4">
              <PredictionInput />
            </Flex>
          </Card>
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
