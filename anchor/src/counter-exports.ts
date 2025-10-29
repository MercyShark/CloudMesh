// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { Cluster, PublicKey } from '@solana/web3.js'
import CounterIDL from '../target/idl/crudapp.json'
import type { Crudapp } from '../target/types/crudapp'

// Re-export the generated IDL and type
export { Crudapp, CounterIDL }

// The programId is imported from the program IDL.
export const COUNTER_PROGRAM_ID = new PublicKey(CounterIDL.address)

// This is a helper function to get the Counter Anchor program.
export function getCounterProgram(provider: AnchorProvider, address?: PublicKey): Program<Crudapp> {
  return new Program({ ...CounterIDL, address: address ? address.toBase58() : CounterIDL.address } as Crudapp, provider)
}

// This is a helper function to get the program ID for the Counter program depending on the cluster.
export function getCounterProgramId(cluster: Cluster) {
  switch (cluster) {
    case 'devnet':
    case 'testnet':
      // This is the program ID for the Counter program on devnet and testnet.
      return new PublicKey('ChxwRcnRkYqhSyN3tTGo3AjMLJ2Va3hZMBYxrG6toT3j')
    case 'mainnet-beta':
    default:
      return COUNTER_PROGRAM_ID
  }
}
