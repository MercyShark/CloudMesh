import { AppProviders } from '@/components/app-providers.tsx'
import { AppLayout } from '@/components/app-layout.tsx'
import { RouteObject, useRoutes } from 'react-router'
import { lazy } from 'react'

const links = [
  // Navigation links
  { label: 'Home', path: '/' },
  { label: 'Create Job', path: '/create-job' },
  { label: 'My Jobs', path: '/my-jobs' },
]

const LazyCloudmeshCreate = lazy(() => import('@/components/cloudmesh/cloudmesh-create-feature'))
const LazyCloudmeshJobs = lazy(() => import('@/components/cloudmesh/cloudmesh-jobs-feature'))
const LazyDashboard = lazy(() => import('@/components/dashboard/dashboard-feature'))
const LazySystemDesign = lazy(() => import('@/components/dashboard/system-design-feature'))

const routes: RouteObject[] = [
  { index: true, element: <LazyDashboard /> },
  { path: 'create-job', element: <LazyCloudmeshCreate /> },
  { path: 'my-jobs', element: <LazyCloudmeshJobs /> },
  { path: 'system-design', element: <LazySystemDesign /> },
]

console.log({ links, routes })

export function App() {
  const router = useRoutes(routes)
  return (
    <AppProviders>
      <AppLayout links={links}>{router}</AppLayout>
    </AppProviders>
  )
}
