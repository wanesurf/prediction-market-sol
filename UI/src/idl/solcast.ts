export const IDL = {
  "version": "0.1.0",
  "name": "solcast",
  "instructions": [
    {
      "name": "buy_share",
      "accounts": [
        {
          "name": "market",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "market_authority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "user_token_account",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "market_token_account",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user_option_token_account",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "token_a_mint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "token_b_mint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "token_program",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "market_id",
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
      "name": "create_market",
      "accounts": [
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "market",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "market_authority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "token_a_mint",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "token_b_mint",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "system_program",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "token_program",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
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
            "array": ["string"]
          }
        },
        {
          "name": "end_time",
          "type": "i64"
        },
        {
          "name": "buy_token",
          "type": "publicKey"
        },
        {
          "name": "banner_url",
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
          "name": "end_time_string",
          "type": "string"
        },
        {
          "name": "start_time_string",
          "type": "string"
        },
        {
          "name": "resolution_source",
          "type": "string"
        }
      ]
    },
    {
      "name": "initialize",
      "accounts": [
        {
          "name": "state",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "system_program",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "resolve",
      "accounts": [
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "market",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "admin",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "market_id",
          "type": "string"
        },
        {
          "name": "winning_option",
          "type": "string"
        }
      ]
    },
    {
      "name": "withdraw",
      "accounts": [
        {
          "name": "market",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "market_authority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "user_token_account",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "market_token_account",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "token_program",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "market_id",
          "type": "string"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "Market",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "string"
          },
          {
            "name": "option_a",
            "type": "string"
          },
          {
            "name": "option_b",
            "type": "string"
          },
          {
            "name": "resolved",
            "type": "bool"
          },
          {
            "name": "outcome",
            "type": {
              "defined": "OutcomeState"
            }
          },
          {
            "name": "end_time",
            "type": "i64"
          },
          {
            "name": "total_value",
            "type": "u64"
          },
          {
            "name": "num_bettors",
            "type": "u64"
          },
          {
            "name": "buy_token",
            "type": "publicKey"
          },
          {
            "name": "token_a_mint",
            "type": "publicKey"
          },
          {
            "name": "token_b_mint",
            "type": "publicKey"
          },
          {
            "name": "banner_url",
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
            "name": "end_time_string",
            "type": "string"
          },
          {
            "name": "start_time_string",
            "type": "string"
          },
          {
            "name": "resolution_source",
            "type": "string"
          },
          {
            "name": "total_option_a",
            "type": "u64"
          },
          {
            "name": "total_option_b",
            "type": "u64"
          },
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "authority_bump",
            "type": "u8"
          },
          {
            "name": "shares",
            "type": {
              "array": [{
                "defined": "Share"
              }]
            }
          }
        ]
      }
    },
    {
      "name": "State",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "publicKey"
          },
          {
            "name": "market_ids",
            "type": {
              "array": ["string"]
            }
          },
          {
            "name": "market_id_counter",
            "type": "u64"
          },
          {
            "name": "last_market_id",
            "type": "u64"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "OutcomeState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Unresolved"
          },
          {
            "name": "OptionA"
          },
          {
            "name": "OptionB"
          }
        ]
      }
    },
    {
      "name": "Share",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "publicKey"
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
            "name": "has_withdrawn",
            "type": "bool"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "Unauthorized",
      "msg": "Unauthorized operation"
    },
    {
      "code": 6001,
      "name": "MarketIdAlreadyExists",
      "msg": "Market ID already exists"
    },
    {
      "code": 6002,
      "name": "InvalidOption",
      "msg": "Invalid option"
    },
    {
      "code": 6003,
      "name": "MarketAlreadyResolved",
      "msg": "Market already resolved"
    },
    {
      "code": 6004,
      "name": "MarketNotFound",
      "msg": "Market not found"
    },
    {
      "code": 6005,
      "name": "MarketNotResolved",
      "msg": "Market not resolved"
    },
    {
      "code": 6006,
      "name": "NoWinningShares",
      "msg": "No winning shares"
    },
    {
      "code": 6007,
      "name": "AlreadyWithdrawn",
      "msg": "You've already withdrawn your winnings"
    },
    {
      "code": 6008,
      "name": "InvalidOptionsCount",
      "msg": "Markets must have exactly two options"
    },
    {
      "code": 6009,
      "name": "InvalidTokenAccount",
      "msg": "Invalid token account"
    },
    {
      "code": 6010,
      "name": "InvalidOptionTokenAccount",
      "msg": "Invalid option token account"
    },
    {
      "code": 6011,
      "name": "InvalidOptionMint",
      "msg": "Invalid option mint"
    },
    {
      "code": 6012,
      "name": "InvalidMarketAuthority",
      "msg": "Invalid market authority"
    }
  ],
  "metadata": {
    "address": "7xMuyXtTipSYeTWb4esdnXyVrs63FeDp7RaEjRzvYUQS"
  }
}; 
