import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import Login from './Login'
import { useAuthStore } from '@/stores/authStore'

// Mock the auth store
vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn()
}))

// Mock navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('Login Page', () => {
  const mockLogin = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuthStore).mockReturnValue({
      login: mockLogin,
      isAuthenticated: false,
    } as any)
  })

  it('should render login form', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )

    expect(screen.getByText('タレントマネジメントシステム')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('メールアドレス')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('パスワード')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument()
  })

  it('should handle successful login', async () => {
    mockLogin.mockResolvedValue(true)
    const user = userEvent.setup()

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )

    const emailInput = screen.getByPlaceholderText('メールアドレス')
    const passwordInput = screen.getByPlaceholderText('パスワード')
    const submitButton = screen.getByRole('button', { name: 'ログイン' })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123')
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  it('should show error on failed login', async () => {
    mockLogin.mockResolvedValue(false)
    const user = userEvent.setup()

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )

    const emailInput = screen.getByPlaceholderText('メールアドレス')
    const passwordInput = screen.getByPlaceholderText('パスワード')
    const submitButton = screen.getByRole('button', { name: 'ログイン' })

    await user.type(emailInput, 'wrong@example.com')
    await user.type(passwordInput, 'wrongpass')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('メールアドレスまたはパスワードが正しくありません')).toBeInTheDocument()
    })
  })

  it('should disable submit button while loading', async () => {
    mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 1000)))
    const user = userEvent.setup()

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )

    const emailInput = screen.getByPlaceholderText('メールアドレス')
    const passwordInput = screen.getByPlaceholderText('パスワード')
    const submitButton = screen.getByRole('button', { name: 'ログイン' })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    expect(submitButton).toBeDisabled()
    expect(screen.getByText('ログイン中...')).toBeInTheDocument()
  })

  it('should redirect if already authenticated', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
      login: mockLogin,
    } as any)

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )

    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('should show test credentials hint', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )

    expect(screen.getByText(/テスト用アカウント/)).toBeInTheDocument()
    expect(screen.getByText(/admin@test.com/)).toBeInTheDocument()
    expect(screen.getByText(/manager@test.com/)).toBeInTheDocument()
    expect(screen.getByText(/employee@test.com/)).toBeInTheDocument()
  })
})