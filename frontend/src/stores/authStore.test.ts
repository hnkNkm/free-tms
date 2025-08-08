import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore } from './authStore'
import { api } from '@/lib/axios'

// Mock the axios instance
vi.mock('@/lib/axios', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  }
}))

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store state
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    })
    
    // Clear localStorage
    localStorage.clear()
    
    // Clear all mocks
    vi.clearAllMocks()
  })

  describe('login', () => {
    it('should login successfully and store token', async () => {
      const mockToken = 'mock-access-token'
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'employee',
      }

      vi.mocked(api.post).mockResolvedValueOnce({
        data: {
          access_token: mockToken,
          token_type: 'bearer',
        }
      })

      vi.mocked(api.get).mockResolvedValueOnce({
        data: mockUser
      })

      const result = await useAuthStore.getState().login('test@example.com', 'password123')

      expect(result).toBe(true)
      expect(localStorage.getItem('access_token')).toBe(mockToken)
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
      expect(useAuthStore.getState().user).toEqual(mockUser)
      
      expect(api.post).toHaveBeenCalledWith('/auth/login', expect.any(FormData))
      expect(api.get).toHaveBeenCalledWith('/auth/me')
    })

    it('should handle login failure', async () => {
      vi.mocked(api.post).mockRejectedValueOnce(new Error('Invalid credentials'))

      const result = await useAuthStore.getState().login('test@example.com', 'wrong-password')

      expect(result).toBe(false)
      expect(localStorage.getItem('access_token')).toBeNull()
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
      expect(useAuthStore.getState().user).toBeNull()
    })
  })

  describe('logout', () => {
    it('should clear auth state and token', () => {
      // Set initial state
      localStorage.setItem('access_token', 'some-token')
      useAuthStore.setState({
        user: { id: 1, email: 'test@example.com', name: 'Test', role: 'employee' },
        isAuthenticated: true,
      })

      // Logout
      useAuthStore.getState().logout()

      expect(localStorage.getItem('access_token')).toBeNull()
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
      expect(useAuthStore.getState().user).toBeNull()
    })
  })

  describe('fetchCurrentUser', () => {
    it('should fetch current user when token exists', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'employee',
      }

      localStorage.setItem('access_token', 'valid-token')
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockUser })

      await useAuthStore.getState().fetchCurrentUser()

      expect(api.get).toHaveBeenCalledWith('/auth/me')
      expect(useAuthStore.getState().user).toEqual(mockUser)
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
    })

    it('should not fetch when no token exists', async () => {
      await useAuthStore.getState().fetchCurrentUser()

      expect(api.get).not.toHaveBeenCalled()
      expect(useAuthStore.getState().user).toBeNull()
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })

    it('should handle fetch error gracefully', async () => {
      localStorage.setItem('access_token', 'invalid-token')
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Unauthorized'))

      await useAuthStore.getState().fetchCurrentUser()

      expect(useAuthStore.getState().user).toBeNull()
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
      expect(useAuthStore.getState().isLoading).toBe(false)
    })
  })
})