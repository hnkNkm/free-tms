import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Layout from './Layout'
import { useAuthStore } from '@/stores/authStore'

// Mock the auth store
vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn()
}))

// Mock the navigate function
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('Layout Component', () => {
  const mockUser = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    role: 'employee',
  }

  const mockLogout = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuthStore).mockReturnValue({
      user: mockUser,
      logout: mockLogout,
    } as any)
  })

  it('should render navigation and children', () => {
    render(
      <BrowserRouter>
        <Layout>
          <div>Test Content</div>
        </Layout>
      </BrowserRouter>
    )

    // Check navigation items
    expect(screen.getByText('ダッシュボード')).toBeInTheDocument()
    expect(screen.getByText('社員管理')).toBeInTheDocument()
    expect(screen.getByText('検索')).toBeInTheDocument()
    expect(screen.getByText('ジョブ管理')).toBeInTheDocument()
    expect(screen.getByText('分析')).toBeInTheDocument()

    // Check user info
    expect(screen.getByText(mockUser.name)).toBeInTheDocument()
    expect(screen.getByText(mockUser.email)).toBeInTheDocument()

    // Check children are rendered
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('should display role badge for admin', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { ...mockUser, role: 'admin' },
      logout: mockLogout,
    } as any)

    render(
      <BrowserRouter>
        <Layout>
          <div>Content</div>
        </Layout>
      </BrowserRouter>
    )

    expect(screen.getByText('管理者')).toBeInTheDocument()
  })

  it('should display role badge for manager', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { ...mockUser, role: 'manager' },
      logout: mockLogout,
    } as any)

    render(
      <BrowserRouter>
        <Layout>
          <div>Content</div>
        </Layout>
      </BrowserRouter>
    )

    expect(screen.getByText('マネージャー')).toBeInTheDocument()
  })

  it('should not display role badge for regular employee', () => {
    render(
      <BrowserRouter>
        <Layout>
          <div>Content</div>
        </Layout>
      </BrowserRouter>
    )

    expect(screen.queryByText('管理者')).not.toBeInTheDocument()
    expect(screen.queryByText('マネージャー')).not.toBeInTheDocument()
  })
})