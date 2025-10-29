import { PublicKey } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useCluster } from '@/components/cluster/cluster-data-access'
import { useAnchorProvider } from '@/components/solana/use-anchor-provider'
import { useTransactionToast } from '@/components/use-transaction-toast'
import { toast } from 'sonner'
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor'
import { Cloudmesh } from '../../../anchor/target/types/cloudmesh'
import CloudmeshIDL from '../../../anchor/target/idl/cloudmesh.json'

const CLOUDMESH_PROGRAM_ID = new PublicKey('5FpaVW1qm2MiELsJK9dqWs6rNMxdoN7wHKXygtcnAD4f')

interface CreateJobArgs {
  title: string
  codeCid: string
  jobType: { cron: {} } | { api: {} } | { manual: {} }
}

export function useCloudmeshProgram() {
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  
  const program = useMemo(
    () => new Program(CloudmeshIDL as any, provider as AnchorProvider) as Program<Cloudmesh>,
    [provider]
  )

  const jobs = useQuery({
    queryKey: ['cloudmesh', 'jobs', { cluster }],
    queryFn: () => (program.account as any).job.all(),
  })

  const createJob = useMutation<string, Error, CreateJobArgs>({
    mutationKey: ['cloudmesh', 'createJob', { cluster }],
    mutationFn: async ({ title, codeCid, jobType }) => {
      return program.methods
        .initializeJob(title, codeCid, jobType)
        .rpc()
    },
    onSuccess: (signature) => {
      transactionToast(signature)
      jobs.refetch()
    },
    onError: (error) => {
      toast.error(`Failed to create job: ${error.message}`)
    },
  })

  return {
    program,
    programId: CLOUDMESH_PROGRAM_ID,
    jobs,
    createJob,
  }
}

export function useCloudmeshJob({ jobAccount }: { jobAccount: PublicKey }) {
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const { program, jobs } = useCloudmeshProgram()
  const provider = useAnchorProvider()

  const jobQuery = useQuery({
    queryKey: ['cloudmesh', 'job', { cluster, account: jobAccount.toString() }],
    queryFn: () => (program.account as any).job.fetch(jobAccount),
  })

  const completeJob = useMutation({
    mutationKey: ['cloudmesh', 'completeJob', { cluster, account: jobAccount.toString() }],
    mutationFn: async ({ resultCid, cost }: { resultCid: string; cost: number }) => {
      const jobData = await (program.account as any).job.fetch(jobAccount)
      return program.methods
        .completeJob(resultCid, new BN(cost))
        .accountsPartial({
          job: jobAccount,
          worker: provider.publicKey,
        })
        .rpc()
    },
    onSuccess: (signature) => {
      transactionToast(signature)
      jobs.refetch()
      jobQuery.refetch()
    },
    onError: (error: Error) => {
      toast.error(`Failed to complete job: ${error.message}`)
    },
  })

  const cancelJob = useMutation({
    mutationKey: ['cloudmesh', 'cancelJob', { cluster, account: jobAccount.toString() }],
    mutationFn: async () => {
      const jobData = await (program.account as any).job.fetch(jobAccount)
      return program.methods
        .cancelJob()
        .accountsPartial({
          job: jobAccount,
          owner: provider.publicKey,
        })
        .rpc()
    },
    onSuccess: (signature) => {
      transactionToast(signature)
      jobs.refetch()
      jobQuery.refetch()
    },
    onError: (error: Error) => {
      toast.error(`Failed to cancel job: ${error.message}`)
    },
  })

  const markPayment = useMutation({
    mutationKey: ['cloudmesh', 'markPayment', { cluster, account: jobAccount.toString() }],
    mutationFn: async () => {
      const jobData = await (program.account as any).job.fetch(jobAccount)
      return program.methods
        .markPayment()
        .accountsPartial({
          job: jobAccount,
          owner: provider.publicKey,
        })
        .rpc()
    },
    onSuccess: (signature) => {
      transactionToast(signature)
      jobs.refetch()
      jobQuery.refetch()
    },
    onError: (error: Error) => {
      toast.error(`Failed to mark payment: ${error.message}`)
    },
  })

  return {
    jobQuery,
    completeJob,
    cancelJob,
    markPayment,
  }
}
