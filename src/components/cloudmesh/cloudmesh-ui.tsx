import { PublicKey } from '@solana/web3.js'
import { useMemo, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { ExplorerLink } from '@/components/cluster/cluster-ui'
import { ellipsify } from '@/lib/utils'
import { useCloudmeshProgram, useCloudmeshJob } from './cloudmesh-data-access'
import { toast } from 'sonner'
import Editor from '@monaco-editor/react'

const CODE_SNIPPETS = {
  hello_world: {
    name: 'Hello World',
    code: `# Hello World Script
def main():
    """Simple Hello World program"""
    print("Hello, World!")
    print("Welcome to CloudMesh!")
    print("Your distributed computing job is running...")

if __name__ == "__main__":
    main()
`
  },
  prime_number: {
    name: 'Prime Number Checker',
    code: `# Prime Number Checker
def is_prime(n):
    """Check if a number is prime"""
    if n < 2:
        return False
    if n == 2:
        return True
    if n % 2 == 0:
        return False
    for i in range(3, int(n**0.5) + 1, 2):
        if n % i == 0:
            return False
    return True

def main():
    numbers = [2, 3, 4, 5, 10, 11, 17, 20, 23, 29]
    for num in numbers:
        result = is_prime(num)
        print(f"{num} is {'prime' if result else 'not prime'}")

if __name__ == "__main__":
    main()
`
  },
  database_backup: {
    name: 'Database Backup',
    code: `# Database Backup Script
import subprocess
import datetime
import os

def backup_database():
    """Backup database to file"""
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = f"backup_{timestamp}.sql"
    
    try:
        # Example: backing up with mysqldump
        cmd = f"mysqldump -u root -p database_name > {backup_file}"
        subprocess.run(cmd, shell=True, check=True)
        print(f"Backup completed: {backup_file}")
        
        # Optional: upload to cloud storage
        upload_to_cloud(backup_file)
        return True
    except Exception as e:
        print(f"Backup failed: {str(e)}")
        return False

def upload_to_cloud(filename):
    """Upload backup to cloud storage"""
    print(f"Uploading {filename} to cloud storage...")
    # Add your cloud upload logic here

def main():
    backup_database()

if __name__ == "__main__":
    main()
`
  },
  email_sending: {
    name: 'Email Sending',
    code: `# Email Sending Script
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

def send_email(recipient, subject, body):
    """Send email via SMTP"""
    sender_email = os.getenv("SENDER_EMAIL")
    sender_password = os.getenv("SENDER_PASSWORD")
    
    try:
        # Create message
        msg = MIMEMultipart()
        msg["From"] = sender_email
        msg["To"] = recipient
        msg["Subject"] = subject
        
        # Attach body
        msg.attach(MIMEText(body, "html"))
        
        # Send email
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(sender_email, sender_password)
            server.send_message(msg)
        
        print(f"Email sent to {recipient}")
        return True
    except Exception as e:
        print(f"Email sending failed: {str(e)}")
        return False

def main():
    recipients = ["user1@example.com", "user2@example.com"]
    subject = "CloudMesh Job Notification"
    body = "<h1>Your job has been processed</h1><p>Status: Success</p>"
    
    for recipient in recipients:
        send_email(recipient, subject, body)

if __name__ == "__main__":
    main()
`
  }
}

export function CloudmeshCreate() {
  const { createJob } = useCloudmeshProgram()
  const { publicKey } = useWallet()
  const [title, setTitle] = useState('')
  const [codeCid, setCodeCid] = useState('')
  const [jobType, setJobType] = useState<'cron' | 'api' | 'manual'>('manual')
  const [cronPattern, setCronPattern] = useState('0 0 * * *')
  const [code, setCode] = useState(`# Python script for CloudMesh & AWS
import json

def lambda_handler(event, context):
    print("hello world")
    return {
        'statusCode': 200,
        'body': json.dumps('Hello from Lambda!')
    }

`)
  const [uploading, setUploading] = useState(false)

  const isFormValid = title.trim() !== '' && codeCid.trim() !== ''

  const uploadToPinata = async (code: string, filename: string): Promise<string> => {
    const PINATA_JWT = import.meta.env.VITE_PINATA_JWT || ''
    
    if (!PINATA_JWT) {
      throw new Error('VITE_PINATA_JWT not configured')
    }

    const formData = new FormData()
    const blob = new Blob([code], { type: 'text/x-python' })
    const file = new File([blob], `${filename}.py`, { type: 'text/x-python' })
    
    formData.append('file', file)
    
    const metadata = JSON.stringify({
      name: `${filename}.py`,
    })
    formData.append('pinataMetadata', metadata)

    const options = JSON.stringify({
      cidVersion: 0,
    })
    formData.append('pinataOptions', options)

    const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`,
      },
      body: formData,
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Upload failed: ${res.status} - ${errorText}`)
    }

    const resData = await res.json()
    return resData.IpfsHash
  }

  const handleUploadCode = async () => {
    setUploading(true)
    
    try {
      const filename = title.trim() || 'script'
      const ipfsHash = await uploadToPinata(code, filename)
      setCodeCid(ipfsHash)
      toast.success('Uploaded to IPFS')
    } catch (err: any) {
      toast.error(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    
    try {
      // Read file content
      const fileContent = await file.text()
      setCode(fileContent)
      
      // Upload to IPFS
      const PINATA_JWT = import.meta.env.VITE_PINATA_JWT || ''
      
      if (!PINATA_JWT) {
        throw new Error('VITE_PINATA_JWT not configured')
      }

      const formData = new FormData()
      formData.append('file', file)
      
      const metadata = JSON.stringify({
        name: file.name,
      })
      formData.append('pinataMetadata', metadata)

      const options = JSON.stringify({
        cidVersion: 0,
      })
      formData.append('pinataOptions', options)

      const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PINATA_JWT}`,
        },
        body: formData,
      })

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`Upload failed: ${res.status} - ${errorText}`)
      }

      const resData = await res.json()
      setCodeCid(resData.IpfsHash)
      toast.success('File uploaded to IPFS')
    } catch (err: any) {
      toast.error(err.message || 'File upload failed')
    } finally {
      setUploading(false)
      // Reset input
      event.target.value = ''
    }
  }

  const handleSubmit = () => {
    if (publicKey && isFormValid) {
      const jobTypeObj = jobType === 'cron' ? { cron: {} } : jobType === 'api' ? { api: {} } : { manual: {} }
      createJob.mutateAsync({ title, codeCid, jobType: jobTypeObj })
      toast.success('Job created')
      setTitle('')
      setCodeCid('')
      setCode(`# Python script for CloudMesh
def main():
    print("Hello from CloudMesh!")

if __name__ == "__main__":
    main()
`)
    }
  }

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        setCodeCid(text.trim())
        toast.success('Pasted')
      }
    } catch (e) {
      toast.error('Clipboard denied')
    }
  }

  const loadCodeSnippet = (snippetKey: keyof typeof CODE_SNIPPETS) => {
    const snippet = CODE_SNIPPETS[snippetKey]
    setCode(snippet.code)
    toast.success(`Loaded: ${snippet.name}`)
  }

  if (!publicKey) {
    return (
      <div className="border border-blue-500/20 bg-white p-8">
        <div className="text-center space-y-3">
          <svg className="w-10 h-10 text-blue-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h3 className="text-sm font-medium text-blue-600">Connect Wallet</h3>
          <p className="text-xs text-gray-700">Connect to create jobs</p>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-blue-500/30 bg-gradient-to-br from-white to-blue-50/30 overflow-hidden w-full h-full shadow-lg">
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-0 h-full w-full">
        {/* Left Side - Form */}
        <div className="lg:col-span-3 p-8 border-r border-blue-500/30 overflow-y-auto bg-white/80 backdrop-blur-sm">
          <h2 className="text-xl font-black text-black mb-8 tracking-tight border-b-2 border-blue-600 pb-3">
            CREATE NEW JOB
          </h2>

          <div className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-black uppercase tracking-wide block">
                Job Title
              </label>
              <input
                type="text"
                placeholder="Enter job title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-white border-2 border-blue-500/40 rounded-lg text-black text-base font-semibold placeholder-gray-500 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
              />
            </div>

            {/* Code Snippets */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-black uppercase tracking-wide block">
                Code Examples
              </label>
              <div className="grid grid-cols-1 gap-2.5">
                <button
                  type="button"
                  onClick={() => loadCodeSnippet('hello_world')}
                  className="px-4 py-3 text-sm font-bold bg-gradient-to-r from-blue-50 to-white text-black border-2 border-blue-500/30 rounded-lg hover:from-blue-100 hover:to-blue-50 hover:border-blue-600 transition-all text-left shadow-sm hover:shadow-md"
                >
                  👋 Hello World
                </button>
                <button
                  type="button"
                  onClick={() => loadCodeSnippet('prime_number')}
                  className="px-4 py-3 text-sm font-bold bg-gradient-to-r from-blue-50 to-white text-black border-2 border-blue-500/30 rounded-lg hover:from-blue-100 hover:to-blue-50 hover:border-blue-600 transition-all text-left shadow-sm hover:shadow-md"
                >
                  🔢 Prime Number
                </button>
                <button
                  type="button"
                  onClick={() => loadCodeSnippet('database_backup')}
                  className="px-4 py-3 text-sm font-bold bg-gradient-to-r from-blue-50 to-white text-black border-2 border-blue-500/30 rounded-lg hover:from-blue-100 hover:to-blue-50 hover:border-blue-600 transition-all text-left shadow-sm hover:shadow-md"
                >
                  💾 Database Backup
                </button>
                <button
                  type="button"
                  onClick={() => loadCodeSnippet('email_sending')}
                  className="px-4 py-3 text-sm font-bold bg-gradient-to-r from-blue-50 to-white text-black border-2 border-blue-500/30 rounded-lg hover:from-blue-100 hover:to-blue-50 hover:border-blue-600 transition-all text-left shadow-sm hover:shadow-md"
                >
                  📧 Email Sending
                </button>
              </div>
            </div>

            {/* Job Type */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-black uppercase tracking-wide block">
                Job Type
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setJobType('manual')}
                  className={`px-4 py-3 text-sm font-bold rounded-lg transition-all shadow-sm hover:shadow-md ${
                    jobType === 'manual'
                      ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                      : 'bg-white text-black border-2 border-blue-500/30 hover:border-blue-600'
                  }`}
                >
                  MANUAL
                </button>
                <button
                  type="button"
                  onClick={() => setJobType('cron')}
                  className={`px-4 py-3 text-sm font-bold rounded-lg transition-all shadow-sm hover:shadow-md ${
                    jobType === 'cron'
                      ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                      : 'bg-white text-black border-2 border-blue-500/30 hover:border-blue-600'
                  }`}
                >
                  CRON
                </button>
                <button
                  type="button"
                  onClick={() => setJobType('api')}
                  className={`px-4 py-3 text-sm font-bold rounded-lg transition-all shadow-sm hover:shadow-md ${
                    jobType === 'api'
                      ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                      : 'bg-white text-black border-2 border-blue-500/30 hover:border-blue-600'
                  }`}
                >
                  API
                </button>
              </div>
            </div>

            {/* Cron Pattern */}
            {jobType === 'cron' && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-black uppercase tracking-wide block">
                  Cron Pattern
                </label>
                <input
                  type="text"
                  placeholder="0 0 * * *"
                  value={cronPattern}
                  onChange={(e) => setCronPattern(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-blue-500/40 rounded-lg text-black text-base font-mono font-semibold placeholder-gray-500 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
                />
                <p className="text-xs font-semibold text-gray-700 mt-2 bg-blue-50 p-2 rounded-md">
                  💡 "0 0 * * *" = Daily at midnight | "*/5 * * * *" = Every 5 minutes
                </p>
              </div>
            )}

            {/* Code CID */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-black uppercase tracking-wide block">
                Code CID (IPFS)
              </label>
              <input
                type="text"
                placeholder="QmXxx..."
                value={codeCid}
                onChange={(e) => setCodeCid(e.target.value)}
                className="w-full px-4 py-3 bg-white border-2 border-blue-500/40 rounded-lg text-black text-base font-mono font-semibold placeholder-gray-500 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={pasteFromClipboard}
                  className="px-4 py-2 text-sm font-bold text-blue-600 bg-white border-2 border-blue-500/40 rounded-lg hover:bg-blue-50 hover:border-blue-600 transition-all shadow-sm"
                >
                  📋 Paste
                </button>
                {codeCid && (
                  <a
                    href={`https://gateway.pinata.cloud/ipfs/${codeCid}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 text-sm font-bold text-blue-600 bg-white border-2 border-blue-500/40 rounded-lg hover:bg-blue-50 hover:border-blue-600 transition-all shadow-sm"
                  >
                    🔗 Preview
                  </a>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={createJob.isPending || !isFormValid}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-base font-black rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-8 shadow-lg hover:shadow-xl disabled:hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {createJob.isPending ? '⏳ CREATING JOB...' : '🚀 CREATE JOB'}
            </button>
          </div>
        </div>

        {/* Right Side - Editor */}
        <div className="lg:col-span-7 flex flex-col border-l-2 border-blue-500/30">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-2 border-b-2 flex items-center justify-between shadow-md">
            <span className="text-xl font-black text-white uppercase tracking-wide">🐍 Python Editor</span>
            <div className="flex gap-2">
              <label className="px-4 py-2 text-sm bg-white text-blue-700 border-2 border-white font-bold rounded-lg hover:bg-blue-50 transition-all cursor-pointer shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95">
                {uploading ? '⏳ Uploading...' : '📁 Upload File from Local'}
                <input
                  type="file"
                  accept=".py,.txt"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
              <button
                onClick={handleUploadCode}
                disabled={uploading}
                className="px-4 py-2 text-sm bg-white text-blue-700 border-2 border-white font-bold rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
              >
                {uploading ? '⏳ Uploading...' : '☁️ Upload to IPFS'}
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              theme="vs-dark"
              language="python"
              value={code}
              onChange={(value) => setCode(value || "")}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: "on",
                wordWrap: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export function CloudmeshJobList() {
  const { jobs } = useCloudmeshProgram()
  const { publicKey } = useWallet()
  const [selectedJob, setSelectedJob] = useState<PublicKey | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const myJobs = jobs.data?.filter((job: any) => job.account.owner.toString() === publicKey?.toString()) || []
  
  const filteredJobs = useMemo(() => {
    let filtered = myJobs
    if (searchQuery) {
      filtered = myJobs.filter((job: any) => 
        job.account.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.account.codeCid.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    // Sort by status (pending first) then by creation date (newest first - descending)
    return filtered.sort((a: any, b: any) => {
      try {
        // Check if status is pending
        const aPending = a.account.status && 'pending' in a.account.status ? 1 : 0
        const bPending = b.account.status && 'pending' in b.account.status ? 1 : 0
        
        // If one is pending and the other isn't, pending comes first
        if (aPending !== bPending) {
          return bPending - aPending
        }
        
        // If both have same status, sort by creation date (newest first)
        const dateA = a.account.createdAt ? (typeof a.account.createdAt === 'number' ? a.account.createdAt : a.account.createdAt.toNumber?.() || 0) : 0
        const dateB = b.account.createdAt ? (typeof b.account.createdAt === 'number' ? b.account.createdAt : b.account.createdAt.toNumber?.() || 0) : 0
        return dateB - dateA
      } catch {
        return 0
      }
    })
  }, [myJobs, searchQuery])

  if (!publicKey) {
    return (
      <div className="border border-blue-500/20 bg-white p-8">
        <div className="text-center space-y-3">
          <svg className="w-10 h-10 text-blue-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-sm font-medium text-blue-600">Connect Wallet</h3>
          <p className="text-xs text-gray-700">Connect to view jobs</p>
        </div>
      </div>
    )
  }

  if (jobs.isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  const getStatusBadge = (status: any) => {
    if (status.pending) 
      return <span className="px-2 py-0.5 text-xs border border-yellow-600/40 text-yellow-700">PENDING</span>
    if (status.completed) 
      return <span className="px-2 py-0.5 text-xs border border-blue-500/40 text-blue-600">COMPLETE</span>
    if (status.cancelled) 
      return <span className="px-2 py-0.5 text-xs border border-red-500/40 text-red-600">CANCELLED</span>
    return <span className="px-2 py-0.5 text-xs border border-gray-400 text-gray-700">UNKNOWN</span>
  }

  const getJobTypeBadge = (type: any) => {
    if (type.cron) 
      return <span className="text-xs text-gray-700">CRON</span>
    if (type.api) 
      return <span className="text-xs text-gray-700">API</span>
    if (type.manual) 
      return <span className="text-xs text-gray-700">MANUAL</span>
    return <span className="text-xs text-gray-600">—</span>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-blue-600">MY JOBS ({myJobs.length})</h2>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search jobs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2.5 bg-white border-2 border-blue-500/40 rounded-lg text-black text-sm font-semibold placeholder-gray-500 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all w-64 shadow-sm"
          />
          <button
            onClick={() => jobs.refetch()}
            className="p-2.5 border-2 border-blue-500/40 rounded-lg text-blue-600 hover:text-white hover:bg-blue-600 hover:border-blue-600 transition-all shadow-sm hover:shadow-md"
            title="Refresh jobs"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <div className="border-2 border-blue-500/30 bg-gradient-to-br from-white to-blue-50/20 rounded-xl shadow-lg overflow-hidden">
        {filteredJobs.length === 0 ? (
          <div className="text-center py-16 px-4">
            <svg className="w-16 h-16 text-blue-500/40 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-sm font-bold text-gray-700">
              {searchQuery ? 'No matching jobs found' : 'No jobs yet. Create your first job!'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-blue-600 to-blue-700 border-b-2 border-blue-800">
                  <th className="px-6 py-4 text-left text-white font-black text-xs uppercase tracking-wider">SR.NO</th>
                  <th className="px-6 py-4 text-left text-white font-black text-xs uppercase tracking-wider">TITLE</th>
                  <th className="px-6 py-4 text-left text-white font-black text-xs uppercase tracking-wider">TYPE</th>
                  <th className="px-6 py-4 text-left text-white font-black text-xs uppercase tracking-wider">STATUS</th>
                  <th className="px-6 py-4 text-left text-white font-black text-xs uppercase tracking-wider">CODE</th>
                  <th className="px-6 py-4 text-left text-white font-black text-xs uppercase tracking-wider">RESULT</th>
                  <th className="px-6 py-4 text-left text-white font-black text-xs uppercase tracking-wider">COST</th>
                  <th className="px-6 py-4 text-left text-white font-black text-xs uppercase tracking-wider">PAID</th>
                  <th className="px-6 py-4 text-left text-white font-black text-xs uppercase tracking-wider">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-500/20 bg-white">
                {filteredJobs.map((job: any, index: number) => (
                  <tr key={job.publicKey.toString()} className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-transparent transition-all">
                    <td className="px-6 py-3">
                      <span className="text-black font-black text-lg">{index + 1}</span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-black font-bold text-base">{job.account.title}</span>
                    </td>
                    <td className="px-6 py-3">{getJobTypeBadge(job.account.jobType)}</td>
                    <td className="px-6 py-3">{getStatusBadge(job.account.status)}</td>
                    <td className="px-6 py-3">
                      <a
                        href={`https://gateway.pinata.cloud/ipfs/${job.account.codeCid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 font-mono font-bold text-sm underline decoration-2 decoration-blue-300 hover:decoration-blue-600 transition-all"
                      >
                        {ellipsify(job.account.codeCid, 8)}
                      </a>
                    </td>
                    <td className="px-6 py-3">
                      {job.account.resultCid ? (
                        <a
                          href={`https://gateway.pinata.cloud/ipfs/${job.account.resultCid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 font-mono font-bold text-sm underline decoration-2 decoration-blue-300 hover:decoration-blue-600 transition-all"
                        >
                          {ellipsify(job.account.resultCid, 8)}
                        </a>
                      ) : (
                        <span className="text-gray-500 font-semibold">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-black font-bold text-base">{job.account.cost.toString()}</span>
                    </td>
                    <td className="px-6 py-3">
                      {job.account.costPaid ? (
                        <span className="text-green-600 font-black text-xl">✓</span>
                      ) : (
                        <span className="text-gray-400 font-semibold">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-1.5">
                        <ExplorerLink
                          path={`account/${job.publicKey.toString()}`}
                          label="↗"
                          className="p-1.5 text-blue-600 hover:text-white hover:bg-blue-600 transition-all rounded-md border-2 border-blue-500/40 hover:border-blue-600 font-black text-sm shadow-sm hover:shadow-md"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(job.publicKey.toString())
                            toast.success('Copied')
                          }}
                          className="p-1.5 text-blue-600 hover:text-white hover:bg-blue-600 transition-all rounded-md border-2 border-blue-500/40 hover:border-blue-600 shadow-sm hover:shadow-md"
                          title="Copy address"
                        >
                          <svg className="w-3.5 h-3.5 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setSelectedJob(job.publicKey)}
                          className="px-3 py-1.5 text-xs text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 font-bold rounded-md shadow-md hover:shadow-lg transition-all transform hover:scale-105 active:scale-95"
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedJob && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setSelectedJob(null)}>
          <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <CloudmeshJobDetails jobAccount={selectedJob} onClose={() => setSelectedJob(null)} />
          </div>
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
    return (
      <div className="border border-blue-500/20 bg-white p-12">
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-600 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const job = jobQuery.data
  if (!job) {
    return (
      <div className="border border-blue-500/20 bg-white p-8 text-center">
        <p className="text-gray-700 text-sm">Job not found</p>
      </div>
    )
  }

  const isPending = job.status && 'pending' in job.status
  const isCompleted = job.status && 'completed' in job.status
  const isCancelled = job.status && 'cancelled' in job.status

  return (
    <div className="border border-blue-500/20 bg-white">
      <div className="p-6">
        <div className="flex items-start justify-between mb-6 pb-3 border-b border-blue-500/20">
          <div>
            <h3 className="text-lg font-medium text-blue-600">{job.title}</h3>
            <div className="mt-1">
              <ExplorerLink path={`account/${jobAccount}`} label={ellipsify(jobAccount.toString())} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-700 hover:text-black transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="p-3 border border-blue-500/20">
            <p className="text-xs text-gray-700 mb-1">OWNER</p>
            <p className="text-xs text-black font-mono">{ellipsify(job.owner.toString())}</p>
          </div>
          <div className="p-3 border border-blue-500/20">
            <p className="text-xs text-gray-700 mb-1">STATUS</p>
            <p className="text-xs text-black">
              {isPending && 'PENDING'}
              {isCompleted && 'COMPLETED'}
              {isCancelled && 'CANCELLED'}
            </p>
          </div>
          <div className="p-3 border border-blue-500/20">
            <p className="text-xs text-gray-700 mb-1">START TIME</p>
            <p className="text-xs text-black">{new Date(job.startTime.toNumber() * 1000).toLocaleString()}</p>
          </div>
          {job.endTime.toNumber() > 0 && (
            <div className="p-3 border border-blue-500/20">
              <p className="text-xs text-gray-700 mb-1">END TIME</p>
              <p className="text-xs text-black">{new Date(job.endTime.toNumber() * 1000).toLocaleString()}</p>
            </div>
          )}
        </div>

        {isPending && (
          <div className="border border-blue-500/20 p-4 mb-4">
            <h4 className="text-sm text-blue-600 mb-4">CANCEL JOB</h4>
            <div className="flex">
              <button
                onClick={() => cancelJob.mutate()}
                disabled={cancelJob.isPending}
                className="w-full py-2 px-4 border border-red-500/40 text-red-600 hover:bg-red-500/10 text-xs font-medium disabled:opacity-30 transition-colors"
              >
                {cancelJob.isPending ? 'CANCELLING...' : 'CANCEL'}
              </button>
            </div>
          </div>
        )}

        {isCompleted && !job.costPaid && (
          <div className="border border-blue-500/20 p-4">
            <button
              onClick={() => markPayment.mutate()}
              disabled={markPayment.isPending}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium disabled:opacity-30 transition-colors"
            >
              {markPayment.isPending ? 'MARKING...' : 'MARK AS PAID'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
