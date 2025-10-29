import { PublicKey } from '@solana/web3.js'
import { useMemo, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { ExplorerLink } from '@/components/cluster/cluster-ui'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ellipsify } from '@/lib/utils'
import { useCloudmeshProgram, useCloudmeshJob } from './cloudmesh-data-access'
import { toast } from 'sonner'

export function CloudmeshCreate() {
  const { createJob } = useCloudmeshProgram()
  const { publicKey } = useWallet()
  const [title, setTitle] = useState('')
  const [codeCid, setCodeCid] = useState('')
  const [jobType, setJobType] = useState<'cron' | 'api' | 'manual'>('manual')

  const isFormValid = title.trim() !== '' && codeCid.trim() !== ''

  const handleSubmit = () => {
    if (publicKey && isFormValid) {
      const jobTypeObj = jobType === 'cron' ? { cron: {} } : jobType === 'api' ? { api: {} } : { manual: {} }
      createJob.mutateAsync({ title, codeCid, jobType: jobTypeObj })
      toast.success('Job created successfully!')
      setTitle('')
      setCodeCid('')
    }
  }

  if (!publicKey) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center">Connect your wallet to create jobs</p>
        </CardContent>
      </Card>
    )
  }

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) setCodeCid(text.trim())
    } catch (e) {
      toast.error('Clipboard access denied')
    }
  }

  return (
    <div className="bg-gradient-to-r from-fuchsia-600/30 via-purple-600/20 to-cyan-600/30 p-[1px] rounded-2xl shadow-xl">
      <Card className="rounded-2xl backdrop-blur bg-base-200/70">
        <CardHeader>
          <CardTitle className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-purple-400 to-cyan-400">Create New Job</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <input
              type="text"
              placeholder="Job Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input input-bordered w-full focus:outline-none focus:border-fuchsia-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Code CID (IPFS)</label>
            <input
              type="text"
              placeholder="QmXxx... or bafxxx..."
              value={codeCid}
              onChange={(e) => setCodeCid(e.target.value)}
              className="input input-bordered w-full focus:outline-none focus:border-cyan-500"
            />
              <div className="flex gap-2 mt-2">
                <Button variant="outline" size="sm" onClick={pasteFromClipboard}>Paste from clipboard</Button>
                {codeCid && (
                  <a
                    className="btn btn-sm btn-ghost"
                    href={`https://gateway.pinata.cloud/ipfs/${codeCid}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Preview on IPFS
                  </a>
                )}
              </div>
          </div>
            <div>
              <label className="block text-sm font-medium mb-2">Job Type</label>
              <div className="join w-full">
                <button
                  className={`btn join-item w-1/3 ${jobType==='manual' ? 'btn-primary' : 'btn-ghost'}`}
                  type="button"
                  onClick={() => setJobType('manual')}
                >Manual</button>
                <button
                  className={`btn join-item w-1/3 ${jobType==='cron' ? 'btn-primary' : 'btn-ghost'}`}
                  type="button"
                  onClick={() => setJobType('cron')}
                >Cron</button>
                <button
                  className={`btn join-item w-1/3 ${jobType==='api' ? 'btn-primary' : 'btn-ghost'}`}
                  type="button"
                  onClick={() => setJobType('api')}
                >API</button>
              </div>
            </div>
          <Button
            onClick={handleSubmit}
            disabled={createJob.isPending || !isFormValid}
            className="w-full bg-gradient-to-r from-fuchsia-600 to-cyan-600 border-0 hover:from-fuchsia-500 hover:to-cyan-500 text-white"
          >
            {createJob.isPending ? 'Creating...' : 'Create Job'}
          </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function CloudmeshJobList() {
  const { jobs } = useCloudmeshProgram()
  const { publicKey } = useWallet()
  const [selectedJob, setSelectedJob] = useState<PublicKey | null>(null)
  const [query, setQuery] = useState('')

console.log('Jobs:', jobs.data)
  if (!publicKey) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center">Connect your wallet to view jobs</p>
        </CardContent>
      </Card>
    )
  }

  if (jobs.isLoading) {
    return (
      <div className="flex justify-center p-8">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  const myJobs = jobs.data?.filter((job: any) => job.account.owner.toString() === publicKey.toString()) || []
  const filtered = useMemo(() => {
    if (!query) return myJobs
    return myJobs.filter((j:any) => j.account.title.toLowerCase().includes(query.toLowerCase()))
  }, [myJobs, query])

  const getStatusBadge = (status: any) => {
    if (status.pending) return <span className="badge badge-warning">Pending</span>
    if (status.completed) return <span className="badge badge-success">Completed</span>
    if (status.cancelled) return <span className="badge badge-error">Cancelled</span>
    return <span className="badge">Unknown</span>
  }

  const getJobTypeBadge = (type: any) => {
    if (type.cron) return <span className="badge badge-info">Cron</span>
    if (type.api) return <span className="badge badge-primary">API</span>
    if (type.manual) return <span className="badge badge-neutral">Manual</span>
    return <span className="badge">Unknown</span>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400">
          My Jobs ({filtered.length})
        </h2>
        <div className="flex gap-2 items-center">
          <input
            value={query}
            onChange={(e)=>setQuery(e.target.value)}
            placeholder="Search by title..."
            className="input input-bordered w-64"
          />
          <Button variant="outline" onClick={()=>jobs.refetch()}>Refresh</Button>
        </div>
      </div>

      <div className="bg-base-200/40 rounded-2xl p-1">
        <Card className="rounded-2xl">
          <CardContent className="pt-6">
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No jobs found. Create one above to get started.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Code CID</th>
                    <th>Result CID</th>
                    <th>Cost</th>
                    <th>Paid</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((job: any) => (
                    <tr key={job.publicKey.toString()} className="hover transition-colors">
                      <td className="font-medium">{job.account.title}</td>
                      <td>{getJobTypeBadge(job.account.jobType)}</td>
                      <td>{getStatusBadge(job.account.status)}</td>
                      <td>
                        <a
                          href={`https://gateway.pinata.cloud/ipfs/${job.account.codeCid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="link link-info text-xs"
                        >
                          {ellipsify(job.account.codeCid, 12)}
                        </a>
                      </td>
                      <td>
                        {job.account.resultCid ? (
                          <a
                            href={`https://gateway.pinata.cloud/ipfs/${job.account.resultCid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link link-info text-xs"
                          >
                            {ellipsify(job.account.resultCid, 12)}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td>{job.account.cost.toString()} lamports</td>
                      <td>
                        {job.account.costPaid ? (
                          <span className="badge badge-success badge-sm">Yes</span>
                        ) : (
                          <span className="badge badge-warning badge-sm">No</span>
                        )}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setSelectedJob(job.publicKey)}>
                            Details
                          </Button>
                          <Button size="sm" onClick={()=> navigator.clipboard.writeText(job.publicKey.toString())}>Copy Key</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </CardContent>
        </Card>
      </div>

      {selectedJob && (
        <div className="bg-gradient-to-r from-cyan-600/30 via-purple-600/20 to-fuchsia-600/30 p-[1px] rounded-2xl">
          <Card className="rounded-2xl backdrop-blur bg-base-200/70">
            <CardHeader>
              <CardTitle className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400">Job Details</CardTitle>
            </CardHeader>
            <CardContent>
              <CloudmeshJobDetails jobAccount={selectedJob} onClose={() => setSelectedJob(null)} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function CloudmeshJobDetails({ jobAccount, onClose }: { jobAccount: PublicKey; onClose: () => void }) {
  const { jobQuery, completeJob, cancelJob, markPayment } = useCloudmeshJob({ jobAccount })
  const [resultCid, setResultCid] = useState('')
  const [cost, setCost] = useState('0')

  if (jobQuery.isLoading) {
    return <div className="flex justify-center p-4"><span className="loading loading-spinner"></span></div>
  }

  const job = jobQuery.data

  if (!job) {
    return <p>Job not found</p>
  }

  const isPending = job.status && 'pending' in job.status
  const isCompleted = job.status && 'completed' in job.status
  const isCancelled = job.status && 'cancelled' in job.status

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400">{job.title}</h3>
          <p className="text-sm text-muted-foreground">
            <ExplorerLink path={`account/${jobAccount}`} label={ellipsify(jobAccount.toString())} />
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onClose} className="hover:border-fuchsia-400">
          Close
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Owner</label>
          <p className="text-sm">{ellipsify(job.owner.toString())}</p>
        </div>
        <div>
          <label className="text-sm font-medium">Status</label>
          <p className="text-sm">
            {isPending && 'Pending'}
            {isCompleted && 'Completed'}
            {isCancelled && 'Cancelled'}
          </p>
        </div>
        <div>
          <label className="text-sm font-medium">Start Time</label>
          <p className="text-sm">{new Date(job.startTime.toNumber() * 1000).toLocaleString()}</p>
        </div>
        {job.endTime.toNumber() > 0 && (
          <div>
            <label className="text-sm font-medium">End Time</label>
            <p className="text-sm">{new Date(job.endTime.toNumber() * 1000).toLocaleString()}</p>
          </div>
        )}
      </div>

      {isPending && (
        <div className="space-y-4 border-t pt-4">
          <h4 className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400">Complete Job</h4>
          <div>
            <label className="block text-sm font-medium mb-2">Result CID</label>
            <input
              type="text"
              placeholder="QmXxx... or bafxxx..."
              value={resultCid}
              onChange={(e) => setResultCid(e.target.value)}
              className="input input-bordered w-full focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Cost (lamports)</label>
            <input
              type="number"
              placeholder="1000000"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className="input input-bordered w-full focus:outline-none focus:border-fuchsia-500"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => completeJob.mutate({ resultCid, cost: parseInt(cost) })}
              disabled={!resultCid || !cost || completeJob.isPending}
              className="bg-gradient-to-r from-cyan-600 to-fuchsia-600 border-0 hover:from-cyan-500 hover:to-fuchsia-500 text-white"
            >
              {completeJob.isPending ? 'Completing...' : 'Complete Job'}
            </Button>
            <Button variant="destructive" onClick={() => cancelJob.mutate()} disabled={cancelJob.isPending}>
              {cancelJob.isPending ? 'Cancelling...' : 'Cancel Job'}
            </Button>
          </div>
        </div>
      )}

      {isCompleted && !job.costPaid && (
        <div className="border-t pt-4">
          <Button onClick={() => markPayment.mutate()} disabled={markPayment.isPending}>
            {markPayment.isPending ? 'Marking...' : 'Mark as Paid'}
          </Button>
        </div>
      )}
    </div>
  )
}
