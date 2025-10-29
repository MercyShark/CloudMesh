export function AppFooter() {
  return (
    <footer className="text-center p-4 bg-white border-t border-blue-500/20 text-xs text-gray-600">
      <span className="text-gray-600">Powered by CloudMesh & Solana</span>
      {' | '}
      <a
        className="hover:text-blue-700 transition-colors text-blue-600"
        href="https://solana.com"
        target="_blank"
        rel="noopener noreferrer"
      >
        Solana Blockchain
      </a>
    </footer>
  )
}
