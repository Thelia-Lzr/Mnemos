import fc from 'fast-check';
import { AdminController } from '../../controllers/AdminController';
import { pool } from '../../config/database';
import { createOpenRouterService } from '../../services/OpenRouterService';

describe('OpenRouter Configuration Management Properties', () => {
  let adminController: AdminController;
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: any;

  beforeEach(() => {
    adminController = new AdminController();
    
    mockRequest = {
      user: { id: 'admin-user-id' },
      body: {},
      params: {},
      query: {}
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Property 21: API密钥配置生效�?, () => {
    it('对于任何管理员保存的API配置更新，系统应该重新初始化OpenRouter服务并使新配置立即生�?, async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          apiKey: fc.string({ minLength: 20, maxLength: 100 }).filter(s => s.startsWith('sk-or-')),
          baseUrl: fc.webUrl(),
          timeout: fc.integer({ min: 1000, max: 120000 }),
          maxRetries: fc.integer({ min: 0, max: 10 }),
          retryDelay: fc.integer({ min: 100, max: 10000 }),
          isActive: fc.boolean()
        }),
        async (config) => {
          // Mock database operations
          const mockQuery = jest.spyOn(pool, 'query').mockImplementation((query: string, values?: any[]) => {
            if (query.includes('INSERT INTO openrouter_config')) {
              return Promise.resolve({
                rows: [{
                  ...config,
                  id: 1,
                  test_status: 'untested',
                  updated_at: new Date(),
                  updated_by: 'admin-user-id'
                }]
              } as any);
            }
            return Promise.resolve({ rows: [] } as any);
          });

          mockRequest.body = config;

          await adminController.updateOpenRouterConfig(mockRequest, mockResponse, mockNext);

          // Verify response indicates successful configuration update
          expect(mockResponse.status).toHaveBeenCalledWith(200);
          expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
              success: true,
              data: expect.objectContaining({
                baseUrl: config.baseUrl,
                timeout: config.timeout,
                maxRetries: config.maxRetries,
                retryDelay: config.retryDelay,
                isActive: config.isActive
              }),
              message: expect.stringContaining('成功')
            })
          );

          mockQuery.mockRestore();
        }
      ), { numRuns: 20 });
    });
  });

  describe('Property 22: API密钥测试准确�?, () => {
    it('对于任何有效的OpenRouter API密钥，测试功能应该能够成功连接并返回可用模型列表', async () => {
      await fc.assert(fc.asyncProperty(
        fc.string({ minLength: 20, maxLength: 100 }).filter(s => s.startsWith('sk-or-')),
        async (apiKey) => {
          // Mock OpenRouter service for testing
          const mockService = createOpenRouterService(true); // Test mode
          
          mockRequest.body = { apiKey };

          await adminController.testOpenRouterKey(mockRequest, mockResponse, mockNext);

          // Verify test result structure
          expect(mockResponse.status).toHaveBeenCalledWith(200);
          expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
              success: true,
              data: expect.objectContaining({
                success: expect.any(Boolean),
                responseTime: expect.any(Number),
                availableModels: expect.any(Array),
                connectionTest: expect.objectContaining({
                  success: expect.any(Boolean),
                  latency: expect.any(Number)
                }),
                modelTests: expect.any(Array),
                testedAt: expect.any(Date)
              })
            })
          );
        }
      ), { numRuns: 15 });
    });

    it('对于无效的API密钥格式，测试功能应该返回格式错�?, async () => {
      await fc.assert(fc.asyncProperty(
        fc.string().filter(s => !s.startsWith('sk-or-') || s.length < 20),
        async (invalidApiKey) => {
          mockRequest.body = { apiKey: invalidApiKey };

          await adminController.testOpenRouterKey(mockRequest, mockResponse, mockNext);

          // Verify validation error response
          expect(mockResponse.status).toHaveBeenCalledWith(400);
          expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
              success: false,
              message: expect.stringContaining('格式')
            })
          );
        }
      ), { numRuns: 10 });
    });
  });

  describe('Property 23: API使用统计完整�?, () => {
    it('对于任何OpenRouter API调用，系统应该准确记录token消耗、模型使用和成本信息', async () => {
      await fc.assert(fc.asyncProperty(
        fc.constantFrom('daily', 'weekly', 'monthly'),
        async (timeRange) => {
          // Mock database query for usage statistics
          const mockQuery = jest.spyOn(pool, 'query').mockImplementation((query: string) => {
            if (query.includes('credit_transactions')) {
              return Promise.resolve({
                rows: [
                  {
                    date: new Date().toISOString().split('T')[0],
                    total_requests: 100,
                    total_credits: 150,
                    avg_credits_per_request: 1.5
                  }
                ]
              } as any);
            }
            return Promise.resolve({ rows: [] } as any);
          });

          mockRequest.query = { timeRange };

          await adminController.getOpenRouterUsageStats(mockRequest, mockResponse, mockNext);

          // Verify usage statistics structure
          expect(mockResponse.status).toHaveBeenCalledWith(200);
          expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
              success: true,
              data: expect.objectContaining({
                daily: expect.objectContaining({
                  totalRequests: expect.any(Number),
                  totalTokens: expect.any(Number),
                  totalCost: expect.any(Number),
                  averageResponseTime: expect.any(Number),
                  errorRate: expect.any(Number)
                }),
                weekly: expect.objectContaining({
                  totalRequests: expect.any(Number),
                  totalTokens: expect.any(Number),
                  totalCost: expect.any(Number)
                }),
                monthly: expect.objectContaining({
                  totalRequests: expect.any(Number),
                  totalTokens: expect.any(Number),
                  totalCost: expect.any(Number)
                }),
                modelUsage: expect.any(Object),
                costAnalysis: expect.objectContaining({
                  totalCost: expect.any(Number),
                  costByModel: expect.any(Object),
                  costByTaskType: expect.any(Object),
                  projectedMonthlyCost: expect.any(Number),
                  costTrend: expect.any(Array)
                }),
                performanceMetrics: expect.objectContaining({
                  averageResponseTime: expect.any(Number),
                  uptime: expect.any(Number),
                  errorRate: expect.any(Number),
                  throughput: expect.any(Number)
                }),
                generatedAt: expect.any(Date)
              })
            })
          );

          mockQuery.mockRestore();
        }
      ), { numRuns: 10 });
    });
  });

  describe('Configuration Validation Properties', () => {
    it('配置验证应该拒绝无效的数值范�?, async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          apiKey: fc.constant('sk-or-valid-test-key-12345'),
          timeout: fc.oneof(
            fc.integer({ max: 999 }),      // Too small
            fc.integer({ min: 120001 })    // Too large
          )
        }),
        async (invalidConfig) => {
          mockRequest.body = invalidConfig;

          await adminController.updateOpenRouterConfig(mockRequest, mockResponse, mockNext);

          // Should reject invalid timeout values
          expect(mockResponse.status).toHaveBeenCalledWith(400);
          expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
              success: false,
              message: expect.stringContaining('Timeout')
            })
          );
        }
      ), { numRuns: 10 });
    });

    it('配置验证应该拒绝无效的重试次�?, async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          apiKey: fc.constant('sk-or-valid-test-key-12345'),
          maxRetries: fc.oneof(
            fc.integer({ max: -1 }),       // Negative
            fc.integer({ min: 11 })        // Too large
          )
        }),
        async (invalidConfig) => {
          mockRequest.body = invalidConfig;

          await adminController.updateOpenRouterConfig(mockRequest, mockResponse, mockNext);

          // Should reject invalid retry values
          expect(mockResponse.status).toHaveBeenCalledWith(400);
          expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
              success: false,
              message: expect.stringContaining('retries')
            })
          );
        }
      ), { numRuns: 10 });
    });
  });

  describe('API Key Format Validation', () => {
    it('应该正确验证OpenRouter API密钥格式', () => {
      // Test valid API key formats
      const validKeys = [
        'sk-or-abcdefghijklmnopqrstuvwxyz123456',
        'sk-or-ABCDEFGHIJKLMNOPQRSTUVWXYZ123456',
        'sk-or-1234567890abcdefghijklmnopqrstuvwxyz',
        'sk-or-validkey123+/='
      ];

      validKeys.forEach(key => {
        // Access private method through any cast for testing
        const isValid = (adminController as any).validateApiKeyFormat(key);
        expect(isValid).toBe(true);
      });

      // Test invalid API key formats
      const invalidKeys = [
        'invalid-key',
        'sk-invalid-key',
        'sk-or-short',
        'sk-or-',
        '',
        'not-an-api-key-at-all'
      ];

      invalidKeys.forEach(key => {
        const isValid = (adminController as any).validateApiKeyFormat(key);
        expect(isValid).toBe(false);
      });
    });
  });
});


