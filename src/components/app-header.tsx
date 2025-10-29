import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { ClusterUiSelect } from './cluster/cluster-ui'
import { WalletButton } from '@/components/solana/solana-provider'
import { Link, useLocation } from 'react-router'

export function AppHeader({ links = [] }: { links: { label: string; path: string }[] }) {
  const { pathname } = useLocation()
  const [showMenu, setShowMenu] = useState(false)

  function isActive(path: string) {
    return path === '/' ? pathname === '/' : pathname.startsWith(path)
  }

  return (
    <header className="relative z-50 px-6 py-4 bg-gradient-to-r from-white to-blue-50/30 border-b-2 border-blue-500/40 shadow-md dark:bg-white dark:text-black">
      <div className="mx-auto flex justify-between items-center">
        <div className="flex items-baseline gap-6">
          <Link to="/" className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 transition-all transform hover:scale-105">
            <span>◇ CloudMesh</span>
          </Link>
          <div className="hidden md:flex items-center">
            <ul className="flex gap-6 flex-nowrap items-center">
              {links.map(({ label, path }) => (
                <li key={path}>
                  <Link
                    className={`font-bold text-sm uppercase tracking-wide hover:text-blue-700 dark:hover:text-blue-700 transition-all transform hover:scale-105 ${isActive(path) ? 'text-black dark:text-black border-b-2 border-blue-600 pb-1' : 'text-gray-700'}`}
                    to={path}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Button variant="ghost" size="icon" className="md:hidden text-blue-600 hover:text-white hover:bg-blue-600 border-2 border-blue-500/40 rounded-lg shadow-sm" onClick={() => setShowMenu(!showMenu)}>
          {showMenu ? <X className="h-6 w-6 font-bold" /> : <Menu className="h-6 w-6 font-bold" />}
        </Button>

        <div className="hidden md:flex items-center gap-3">
          <WalletButton />
          <ClusterUiSelect />
        </div>

        {showMenu && (
          <div className="md:hidden fixed inset-x-0 top-[64px] bottom-0 bg-gradient-to-b from-white to-blue-50/20 backdrop-blur-sm border-t-2 border-blue-500/40 shadow-lg">
            <div className="flex flex-col p-6 gap-6">
              <ul className="flex flex-col gap-4">
                {links.map(({ label, path }) => (
                  <li key={path}>
                    <Link
                      className={`hover:text-blue-700 block text-lg font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105 ${isActive(path) ? 'text-black bg-blue-100 border-l-4 border-blue-600' : 'text-gray-700 hover:bg-blue-50/50'}`}
                      to={path}
                      onClick={() => setShowMenu(false)}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-4">
                <WalletButton />
                <ClusterUiSelect />
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
