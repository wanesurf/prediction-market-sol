"use client";
import up_higher from "@/assets/up_higher.gif";
import decide_no from "@/assets/decide_no.gif";
import make_decision from "@/assets/make_decision.gif";

import { useEffect, useState } from "react";
import { Card, Skeleton } from "@radix-ui/themes";
import { VoteBar } from "./VoteBar";
import solana from "@/assets/solana-sol-logo.svg";
import { Input } from "./Input";
import { Button } from "./Button";
import { useWallet } from "@solana/wallet-adapter-react";

export default function PredictionInput() {
  const [tokenPrice, setTokenPrice] = useState(0);
  const [currentGif, setCurrentGif] = useState(make_decision);
  const [amount, setAmount] = useState("");
  const [showEstimatedWinnings, setShowEstimatedWinnings] = useState(false);
  const [option, setOption] = useState<"YES" | "NO">("YES");
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const { publicKey, connected, wallet } = useWallet();

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
        );
        const data = await response.json();
        setTokenPrice(data.solana.usd);
        console.log(data.solana.usd);
      } catch (error) {
        console.error("Failed to fetch price:", error);
      }
    };

    fetchPrice();
  }, []);
  const handleAmountChange = (value: string) => {
    // Only allow numbers and at most one decimal point
    const sanitizedValue = value.replace(/[^\d.]/g, "");
    // Prevent multiple decimal points
    const parts = sanitizedValue.split(".");
    const cleanValue = parts[0] + (parts.length > 1 ? "." + parts[1] : "");
    // Remove leading zeros
    const finalValue = cleanValue.replace(/^0+(?=\d)/, "") || "0"; // Ensure "0" remains if the input is cleared
    setAmount(finalValue);
  };
  return (
    <Card className=" shadow-2xl w-full h-full flex items-center justify-center">
      <div className="flex justify-center w-full">
        <img
          src={currentGif.src}
          alt="Prediction Market"
          className="rounded-lg w-24 h-24 sm:w-32 sm:h-32"
        />
      </div>

      <div className="space-y-4 my-20">
        <VoteBar yesPercentage={10} noPercentage={90} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Button
          className={`h-12 text-sm font-semibold ${
            option === "YES"
              ? "bg-green-500 hover:bg-green-600  text-white"
              : "bg-green-500/20 hover:bg-green-600/30 text-white"
          }`}
          onClick={() => {
            setOption("YES");
            setCurrentGif(up_higher);
          }}
        >
          Yes
        </Button>
        <Button
          className={`h-12 text-sm font-semibold ${
            option === "NO"
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-red-500/20 hover:bg-red-600/30 text-white"
          }`}
          onClick={() => {
            setOption("NO");
            setCurrentGif(decide_no);
          }}
        >
          No
        </Button>
      </div>

      {/* Show Connect Wallet button if wallet is not connected */}
      {!connected && (
        <Button
          className="w-full h-12 mt-10 text-sm font-semibold bg-violet-600 hover:bg-violet-800 text-white transition-all duration-300"
          onClick={() => {
            // handleConnect();
          }}
        >
          Connect Wallet
        </Button>
      )}

      {/* Show amount input and place prediction button only if wallet is connected */}
      {connected && option && (
        <div className="space-y-4 ">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">Amount</label>
            <div className="relative">
              <img
                src={solana.src}
                alt="Prediction Market"
                className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50"
              />
              <Input
                type="tel"
                inputMode="decimal"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="pl-10 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:ring-2 focus:ring-purple-500"
              />
            </div>
            {/* Add USD equivalent display */}
            <div className="text-sm text-white/60">
              ≈ ${(Number(amount) * tokenPrice).toFixed(2)} USD
            </div>
          </div>
          {/* Add calculated potential winnings display */}
          {amount && Number(amount) > 0 && (
            <div className="mt-2 p-3 bg-white/5 rounded-lg">
              <button
                onClick={() => setShowEstimatedWinnings(!showEstimatedWinnings)}
                className="flex items-center justify-between w-full text-sm text-white/80 mb-2"
              >
                <span>Estimated Winnings</span>
                <span className="text-xs">
                  {showEstimatedWinnings ? "▼" : "▶"}
                </span>
              </button>

              {showEstimatedWinnings && (
                <div className="flex justify-between">
                  <div>
                    <div
                      className={`${
                        option === "YES" ? "text-green-500" : "text-red-500"
                      } font-semibold`}
                    >
                      {option}: ${/* TODO: Calculate the winnings */}
                    </div>{" "}
                    <div className="text-sm text-white/60">
                      {/* TODO: Calculate the winnings */}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
