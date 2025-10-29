export default function SystemDesignFeature() {
  return (
    <div className="relative w-full h-full min-h-screen flex flex-col bg-white overflow-hidden">
      {/* Hero Section */}
      <div className="relative flex-1 flex flex-col items-center justify-start pt-12 px-4 py-8">
        {/* Main Content Card */}
        <div className="w-full max-w-6xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter text-blue-700 mb-4">
              System Design
            </h1>
            <p className="text-lg sm:text-xl text-gray-700 font-medium">
              CloudMesh Architecture Overview
            </p>
          </div>

          {/* System Design Diagram */}
          <div className="flex justify-center">
            <img
              src="/system_design.svg"
              alt="CloudMesh System Design Architecture"
              className="w-full h-auto"
              loading="eager"
            />
          </div>

          {/* Description */}
          <div className="mt-8 text-center max-w-3xl mx-auto">
            <p className="text-gray-700 text-base leading-relaxed">
              This diagram illustrates the architecture of CloudMesh, a decentralized serverless compute platform 
              powered by Solana blockchain. The system enables distributed job execution across multiple cloud 
              providers with on-chain verification and payment settlement.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
