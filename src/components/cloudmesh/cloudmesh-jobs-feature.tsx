import { CloudmeshJobList } from './cloudmesh-ui'

export default function CloudmeshJobsFeature() {
  return (
    <div className="w-screen max-w-full overflow-x-hidden py-8">
      <div className="space-y-6 w-full max-w-full">
        {/* <div className="px-4 md:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-1 text-green-400">My Jobs</h1>
          <p className="text-sm text-green-500/60">View, manage, and monitor your distributed computing jobs</p>
        </div> */}
        
        <div className="w-full max-w-full overflow-x-hidden">
          <CloudmeshJobList />
        </div>
      </div>
    </div>
  )
}
