import { useNavigate } from 'react-router'

export default function CloudmeshFeature() {
  const navigate = useNavigate()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold mb-2 text-green-400">CloudMesh Job Manager</h1>
          <p className="text-green-500/60">Create and manage distributed computing jobs on Solana blockchain</p>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create Job Card */}
          <div
            className="border border-green-500/20 bg-black p-8 rounded-lg hover:border-green-500/50 transition-all cursor-pointer group"
            onClick={() => navigate('create')}
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors flex items-center justify-center">
                <span className="text-2xl">➕</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-green-400 mb-2">Create Job</h2>
                <p className="text-green-500/60 mb-4">
                  Upload your Python code and configure a new distributed computing job on CloudMesh
                </p>
                <button
                  className="px-4 py-2 bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 rounded transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate('create')
                  }}
                >
                  Create New Job →
                </button>
              </div>
            </div>
          </div>

          {/* My Jobs Card */}
          <div
            className="border border-green-500/20 bg-black p-8 rounded-lg hover:border-green-500/50 transition-all cursor-pointer group"
            onClick={() => navigate('jobs')}
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors flex items-center justify-center">
                <span className="text-2xl">📋</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-green-400 mb-2">My Jobs</h2>
                <p className="text-green-500/60 mb-4">
                  View, monitor, and manage all your distributed computing jobs and their results
                </p>
                <button
                  className="px-4 py-2 bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 rounded transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate('jobs')
                  }}
                >
                  View Jobs →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="border border-green-500/20 bg-black p-6 rounded-lg">
          <h3 className="text-lg font-bold text-green-400 mb-3">How it Works</h3>
          <ul className="space-y-2 text-green-500/60 text-sm">
            <li>✓ <strong>Create:</strong> Upload your Python code and set job parameters</li>
            <li>✓ <strong>Submit:</strong> Deploy your job to the CloudMesh network</li>
            <li>✓ <strong>Execute:</strong> Your code runs on distributed nodes</li>
            <li>✓ <strong>Monitor:</strong> Track execution status and retrieve results from IPFS</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
