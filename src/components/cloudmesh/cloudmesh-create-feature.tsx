import { CloudmeshCreate } from './cloudmesh-ui'

export default function CloudmeshCreateFeature() {
  return (
    <div className="w-full h-full min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col">
        {/* <div className="px-4 py-4 flex-shrink-0"> */}
          {/* <h1 className="text-3xl font-bold mb-1 text-green-400">Create New Job</h1> */}
          {/* <p className="text-sm text-green-500/60">Upload and configure your distributed computing job on Solana</p> */}
        {/* </div> */}
        
        <div className="flex-1 overflow-hidden px-4 pb-4">
          <CloudmeshCreate />
        </div>
      </div>
    </div>
  )
}
