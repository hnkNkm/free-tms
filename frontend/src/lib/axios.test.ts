import { describe, it, expect, beforeEach, vi } from 'vitest'
import { api } from './axios'

describe('Axios Configuration', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('should have correct base URL', () => {
    expect(api.defaults.baseURL).toBe('http://localhost:8000/api/v1')
  })

  it('should have correct default headers', () => {
    expect(api.defaults.headers['Content-Type']).toBe('application/json')
  })

  it('should add authorization header when token exists', async () => {
    const token = 'test-token-123'
    localStorage.setItem('access_token', token)

    // Make a mock request config
    const config = {
      url: '/test',
      method: 'get' as const,
      headers: {}
    }

    // Get the request interceptor
    const requestInterceptor = api.interceptors.request.handlers[0]
    const modifiedConfig = await requestInterceptor.fulfilled(config)

    expect(modifiedConfig.headers.Authorization).toBe(`Bearer ${token}`)
  })

  it('should not add authorization header when no token', async () => {
    const config = {
      url: '/test',
      method: 'get' as const,
      headers: {}
    }

    const requestInterceptor = api.interceptors.request.handlers[0]
    const modifiedConfig = await requestInterceptor.fulfilled(config)

    expect(modifiedConfig.headers.Authorization).toBeUndefined()
  })

  it('should handle 401 errors by clearing token and redirecting', async () => {
    localStorage.setItem('access_token', 'some-token')
    
    // Mock window.location.href
    delete (window as any).location
    window.location = { href: '' } as any

    const error = {
      response: {
        status: 401,
        data: {}
      }
    }

    const responseInterceptor = api.interceptors.response.handlers[0]
    
    try {
      await responseInterceptor.rejected(error)
    } catch (e) {
      // Expected to reject
    }

    expect(localStorage.getItem('access_token')).toBeNull()
    expect(window.location.href).toBe('/login')
  })

  it('should pass through non-401 errors', async () => {
    const error = {
      response: {
        status: 500,
        data: { message: 'Server error' }
      }
    }

    const responseInterceptor = api.interceptors.response.handlers[0]
    
    await expect(responseInterceptor.rejected(error)).rejects.toEqual(error)
  })
})