/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/solcast.json`.
 */
export type Solcast = {
  "address": "7QDrqqkxpti8WN4amvMHmcmZtonYeAzYrmdXefvEx3xJ",
  "metadata": {
    "name": "solcast",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "buyShare",
      "discriminator": [
        225,
        72,
        68,
        20,
        61,
        152,
        46,
        177
      ],
      "accounts": [
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "marketAuthority"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "marketId",
          "type": "string"
        },
        {
          "name": "option",
          "type": "string"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "createMarket",
      "discriminator": [
        103,
        226,
        97,
        235,
        200,
        188,
        251,
        254
      ],
      "accounts": [
        {
          "name": "state",
          "writable": true
        },
        {
          "name": "market",
          "writable": true,
          "signer": true
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "marketAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "arg",
                "path": "id"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "id",
          "type": "string"
        },
        {
          "name": "options",
          "type": {
            "vec": "string"
          }
        },
        {
          "name": "endTime",
          "type": "i64"
        },
        {
          "name": "bannerUrl",
          "type": "string"
        },
        {
          "name": "description",
          "type": "string"
        },
        {
          "name": "title",
          "type": "string"
        },
        {
          "name": "endTimeString",
          "type": "string"
        },
        {
          "name": "startTimeString",
          "type": "string"
        },
        {
          "name": "resolutionSource",
          "type": "string"
        }
      ]
    },
    {
      "name": "getAllMarkets",
      "discriminator": [
        250,
        169,
        148,
        242,
        226,
        139,
        84,
        90
      ],
      "accounts": [
        {
          "name": "state"
        }
      ],
      "args": [],
      "returns": {
        "vec": {
          "defined": {
            "name": "marketInfo"
          }
        }
      }
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "state",
          "writable": true,
          "signer": true
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "resolve",
      "discriminator": [
        246,
        150,
        236,
        206,
        108,
        63,
        58,
        10
      ],
      "accounts": [
        {
          "name": "state",
          "writable": true
        },
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "admin",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "marketId",
          "type": "string"
        },
        {
          "name": "winningOption",
          "type": "string"
        }
      ]
    },
    {
      "name": "withdraw",
      "discriminator": [
        183,
        18,
        70,
        156,
        148,
        109,
        161,
        34
      ],
      "accounts": [
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "marketAuthority"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "marketId",
          "type": "string"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "market",
      "discriminator": [
        219,
        190,
        213,
        55,
        0,
        227,
        198,
        154
      ]
    },
    {
      "name": "state",
      "discriminator": [
        216,
        146,
        107,
        94,
        104,
        75,
        182,
        177
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorized",
      "msg": "Unauthorized operation"
    },
    {
      "code": 6001,
      "name": "marketIdAlreadyExists",
      "msg": "Market ID already exists"
    },
    {
      "code": 6002,
      "name": "invalidOption",
      "msg": "Invalid option"
    },
    {
      "code": 6003,
      "name": "marketAlreadyResolved",
      "msg": "Market already resolved"
    },
    {
      "code": 6004,
      "name": "marketNotFound",
      "msg": "Market not found"
    },
    {
      "code": 6005,
      "name": "marketNotResolved",
      "msg": "Market not resolved"
    },
    {
      "code": 6006,
      "name": "noWinningShares",
      "msg": "No winning shares"
    },
    {
      "code": 6007,
      "name": "alreadyWithdrawn",
      "msg": "You've already withdrawn your winnings"
    },
    {
      "code": 6008,
      "name": "invalidOptionsCount",
      "msg": "Markets must have exactly two options"
    },
    {
      "code": 6009,
      "name": "invalidTokenAccount",
      "msg": "Invalid token account"
    },
    {
      "code": 6010,
      "name": "invalidOptionTokenAccount",
      "msg": "Invalid option token account"
    },
    {
      "code": 6011,
      "name": "invalidOptionMint",
      "msg": "Invalid option mint"
    },
    {
      "code": 6012,
      "name": "invalidMarketAuthority",
      "msg": "Invalid market authority"
    }
  ],
  "types": [
    {
      "name": "market",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "string"
          },
          {
            "name": "optionA",
            "type": "string"
          },
          {
            "name": "optionB",
            "type": "string"
          },
          {
            "name": "resolved",
            "type": "bool"
          },
          {
            "name": "outcome",
            "type": {
              "defined": {
                "name": "outcomeState"
              }
            }
          },
          {
            "name": "endTime",
            "type": "i64"
          },
          {
            "name": "totalValue",
            "type": "u64"
          },
          {
            "name": "numBettors",
            "type": "u64"
          },
          {
            "name": "bannerUrl",
            "type": "string"
          },
          {
            "name": "description",
            "type": "string"
          },
          {
            "name": "title",
            "type": "string"
          },
          {
            "name": "endTimeString",
            "type": "string"
          },
          {
            "name": "startTimeString",
            "type": "string"
          },
          {
            "name": "resolutionSource",
            "type": "string"
          },
          {
            "name": "totalOptionA",
            "type": "u64"
          },
          {
            "name": "totalOptionB",
            "type": "u64"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "authorityBump",
            "type": "u8"
          },
          {
            "name": "shares",
            "type": {
              "vec": {
                "defined": {
                  "name": "share"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "marketInfo",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "string"
          },
          {
            "name": "address",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "outcomeState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "unresolved"
          },
          {
            "name": "optionA"
          },
          {
            "name": "optionB"
          }
        ]
      }
    },
    {
      "name": "share",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "option",
            "type": "string"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "hasWithdrawn",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "state",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "marketIds",
            "type": {
              "vec": "string"
            }
          },
          {
            "name": "marketIdCounter",
            "type": "u64"
          },
          {
            "name": "lastMarketId",
            "type": "u64"
          },
          {
            "name": "marketAddresses",
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    }
  ]
};
