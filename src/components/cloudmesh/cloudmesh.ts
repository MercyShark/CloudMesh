/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/cloudmesh.json`.
 */
export type Cloudmesh = {
  "address": "2pbdwB29EXvsfEcigJrMwEaDx2T16zZ47aK5oGabjx7S",
  "metadata": {
    "name": "cloudmesh",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "cancelJob",
      "discriminator": [
        126,
        241,
        155,
        241,
        50,
        236,
        83,
        118
      ],
      "accounts": [
        {
          "name": "job",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  106,
                  111,
                  98
                ]
              },
              {
                "kind": "account",
                "path": "job.owner",
                "account": "job"
              },
              {
                "kind": "account",
                "path": "job.title",
                "account": "job"
              }
            ]
          }
        },
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "job"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "completeJob",
      "discriminator": [
        221,
        216,
        225,
        72,
        101,
        250,
        3,
        11
      ],
      "accounts": [
        {
          "name": "job",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  106,
                  111,
                  98
                ]
              },
              {
                "kind": "account",
                "path": "job.owner",
                "account": "job"
              },
              {
                "kind": "account",
                "path": "job.title",
                "account": "job"
              }
            ]
          }
        },
        {
          "name": "worker",
          "docs": [
            "Worker authorized to complete jobs"
          ],
          "signer": true
        }
      ],
      "args": [
        {
          "name": "resultCid",
          "type": "string"
        },
        {
          "name": "cost",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializeJob",
      "discriminator": [
        137,
        22,
        138,
        41,
        76,
        208,
        114,
        50
      ],
      "accounts": [
        {
          "name": "job",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  106,
                  111,
                  98
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "title"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "title",
          "type": "string"
        },
        {
          "name": "codeCid",
          "type": "string"
        },
        {
          "name": "jobType",
          "type": {
            "defined": {
              "name": "jobType"
            }
          }
        }
      ]
    },
    {
      "name": "markPayment",
      "discriminator": [
        164,
        94,
        195,
        185,
        80,
        44,
        233,
        243
      ],
      "accounts": [
        {
          "name": "job",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  106,
                  111,
                  98
                ]
              },
              {
                "kind": "account",
                "path": "job.owner",
                "account": "job"
              },
              {
                "kind": "account",
                "path": "job.title",
                "account": "job"
              }
            ]
          }
        },
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "job"
          ]
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "job",
      "discriminator": [
        75,
        124,
        80,
        203,
        161,
        180,
        202,
        80
      ]
    }
  ],
  "events": [
    {
      "name": "jobCancelled",
      "discriminator": [
        203,
        84,
        143,
        130,
        48,
        134,
        74,
        191
      ]
    },
    {
      "name": "jobCompleted",
      "discriminator": [
        176,
        207,
        246,
        115,
        95,
        179,
        9,
        132
      ]
    },
    {
      "name": "jobCreated",
      "discriminator": [
        48,
        110,
        162,
        177,
        67,
        74,
        159,
        131
      ]
    },
    {
      "name": "paymentMarked",
      "discriminator": [
        70,
        8,
        172,
        75,
        106,
        170,
        251,
        234
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidTitle",
      "msg": "Title must be between 1 and 100 characters"
    },
    {
      "code": 6001,
      "name": "invalidCid",
      "msg": "CID must be between 1 and 100 characters"
    },
    {
      "code": 6002,
      "name": "invalidCost",
      "msg": "Cost must be greater than 0"
    },
    {
      "code": 6003,
      "name": "jobAlreadyCompleted",
      "msg": "Job is already completed"
    },
    {
      "code": 6004,
      "name": "jobCancelled",
      "msg": "Job has been cancelled"
    },
    {
      "code": 6005,
      "name": "jobAlreadyCancelled",
      "msg": "Job is already cancelled"
    },
    {
      "code": 6006,
      "name": "invalidStatusTransition",
      "msg": "Invalid status transition"
    },
    {
      "code": 6007,
      "name": "alreadyPaid",
      "msg": "Payment already marked as paid"
    },
    {
      "code": 6008,
      "name": "unauthorized",
      "msg": "Unauthorized: Only owner can perform this action"
    }
  ],
  "types": [
    {
      "name": "job",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "title",
            "type": "string"
          },
          {
            "name": "codeCid",
            "type": "string"
          },
          {
            "name": "resultCid",
            "type": "string"
          },
          {
            "name": "startTime",
            "type": "i64"
          },
          {
            "name": "endTime",
            "type": "i64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "jobStatus"
              }
            }
          },
          {
            "name": "jobType",
            "type": {
              "defined": {
                "name": "jobType"
              }
            }
          },
          {
            "name": "cost",
            "type": "u64"
          },
          {
            "name": "costPaid",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "jobCancelled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "jobKey",
            "type": "pubkey"
          },
          {
            "name": "cancelledAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "jobCompleted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "jobKey",
            "type": "pubkey"
          },
          {
            "name": "resultCid",
            "type": "string"
          },
          {
            "name": "endTime",
            "type": "i64"
          },
          {
            "name": "cost",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "jobCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "jobKey",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "title",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "jobStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pending"
          },
          {
            "name": "completed"
          },
          {
            "name": "cancelled"
          }
        ]
      }
    },
    {
      "name": "jobType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "cron"
          },
          {
            "name": "api"
          },
          {
            "name": "manual"
          }
        ]
      }
    },
    {
      "name": "paymentMarked",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "jobKey",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
