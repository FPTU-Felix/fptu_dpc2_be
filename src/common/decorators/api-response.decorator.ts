import { Type, applyDecorators } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiResponse,
  ApiResponseOptions,
  getSchemaPath,
} from '@nestjs/swagger';

/**
 * Tạo response decorator với type và example.
 */
export function buildResponseDecorator(
  status: number,
  description: string,
  type?: Type<unknown>,
  example?: Record<string, unknown>,
): MethodDecorator & ClassDecorator {
  const options: ApiResponseOptions = {
    status,
    description,
  };

  const decorators: MethodDecorator[] = [];

  if (type) {
    decorators.push(ApiExtraModels(type));

    if (example) {
      (options as ApiResponseOptions & { schema: Record<string, unknown> }).schema = {
        type: 'object',
        properties: {
          statusCode: { type: 'integer', example: status },
          message: { type: 'string', example: description },
          data: Array.isArray(example)
            ? {
                type: 'array',
                items: { $ref: getSchemaPath(type) },
              }
            : { $ref: getSchemaPath(type) },
        },
      };
      options.type = Object;
    } else {
      options.type = type;
    }
  } else if (example) {
    (options as ApiResponseOptions & { schema: Record<string, unknown> }).schema = {
      type: 'object',
      properties: {
        statusCode: { type: 'integer', example: status },
        message: { type: 'string', example: description },
        ...example,
      },
    };
  }

  decorators.push(ApiResponse(options));
  return applyDecorators(...decorators);
}

/**
 * Response 200 - Thành công với data.
 * @param type - Dto class cho data
 * @param description - Mô tả response
 * @param example - Ví dụ response (tùy chọn)
 */
export function ApiOkResponseData<T>(
  type: Type<T>,
  description = 'Thành công - Trả về dữ liệu',
  example?: Record<string, unknown>,
): MethodDecorator & ClassDecorator {
  return buildResponseDecorator(200, description, type, example);
}

/**
 * Response 200 - Thành công với message string.
 * @param message - Message mặc định
 */
export function ApiOkResponseMessage(
  message = 'Thành công',
): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ApiResponse({
      status: 200,
      description: message,
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'integer', example: 200 },
          message: { type: 'string', example: message },
        },
      },
    }),
  );
}

/**
 * Response 200 - Thành công với message và count.
 */
export function ApiOkResponseMessageWithCount(
  message = 'Thành công',
  count?: number,
): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ApiResponse({
      status: 200,
      description: message,
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'integer', example: 200 },
          message: { type: 'string', example: message },
          count: { type: 'integer', example: count ?? 0 },
        },
      },
    }),
  );
}

/**
 * Response 201 - Tạo mới thành công.
 */
export function ApiCreatedResponse(
  description = 'Tạo mới thành công',
): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ApiResponse({
      status: 201,
      description,
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'integer', example: 201 },
          message: { type: 'string', example: description },
        },
      },
    }),
  );
}

/**
 * Response 401 - Unauthorized.
 */
export function ApiUnauthorizedResponse(
  message = 'Token không hợp lệ hoặc đã hết hạn',
): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ApiResponse({
      status: 401,
      description: `Unauthorized - ${message}`,
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'integer', example: 401 },
          message: { type: 'string', example: 'Unauthorized' },
          error: { type: 'string', example: 'Unauthorized' },
        },
      },
    }),
  );
}

/**
 * Response 403 - Forbidden.
 */
export function ApiForbiddenResponse(
  message = 'Không có quyền truy cập',
): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ApiResponse({
      status: 403,
      description: `Forbidden - ${message}`,
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'integer', example: 403 },
          message: { type: 'string', example: 'Forbidden resource' },
          error: { type: 'string', example: 'Forbidden' },
        },
      },
    }),
  );
}

/**
 * Response 404 - Not Found.
 */
export function ApiNotFoundResponse(
  resource = 'Resource',
  message = 'Không tìm thấy',
): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ApiResponse({
      status: 404,
      description: `${resource} ${message}`,
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'integer', example: 404 },
          message: { type: 'string', example: `${resource} not found` },
          error: { type: 'string', example: 'Not Found' },
        },
      },
    }),
  );
}

/**
 * Response 400 - Bad Request.
 */
export function ApiBadRequestResponse(
  message = 'Dữ liệu không hợp lệ',
): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ApiResponse({
      status: 400,
      description: `Bad Request - ${message}`,
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'integer', example: 400 },
          message: { type: 'string', example: message },
          error: { type: 'string', example: 'Bad Request' },
        },
      },
    }),
  );
}

/**
 * Response 409 - Conflict.
 */
export function ApiConflictResponse(
  resource = 'Resource',
  message = 'Đã tồn tại',
): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ApiResponse({
      status: 409,
      description: `Conflict - ${resource} ${message}`,
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'integer', example: 409 },
          message: { type: 'string', example: `${resource} already exists` },
          error: { type: 'string', example: 'Conflict' },
        },
      },
    }),
  );
}

/**
 * Response paginated - Thành công với pagination.
 */
export function ApiPaginatedResponse<T>(
  type: Type<T>,
  description = 'Thành công - Trả về danh sách có phân trang',
): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ApiExtraModels(type),
    ApiResponse({
      status: 200,
      description,
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: description },
          data: {
            type: 'array',
            items: { $ref: getSchemaPath(type) },
          },
          meta: {
            type: 'object',
            properties: {
              total: { type: 'integer', example: 100 },
              page: { type: 'integer', example: 1 },
              limit: { type: 'integer', example: 10 },
              totalPages: { type: 'integer', example: 10 },
            },
          },
        },
      },
    }),
  );
}

// =============================================================================
// Response với format { data, success }
// =============================================================================

/**
 * Response 200 - Thành công với data và success.
 * Format: { success: true, data: T }
 */
export function ApiSuccessResponse<T>(
  type: Type<T>,
  description = 'Thành công',
  isArray = false,
): MethodDecorator & ClassDecorator {
  const decorators: MethodDecorator[] = [ApiExtraModels(type)];

  (decorators as MethodDecorator[]).push(
    ApiResponse({
      status: 200,
      description,
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: description },
          data: isArray
            ? {
                type: 'array',
                items: { $ref: getSchemaPath(type) },
              }
            : { $ref: getSchemaPath(type) },
        },
      },
    }),
  );

  return applyDecorators(...decorators);
}

/**
 * Response 200 - Thành công với message.
 * Format: { success: true, message: string }
 */
export function ApiSuccessMessage(
  message = 'Thành công',
): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ApiResponse({
      status: 200,
      description: message,
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: message },
        },
      },
    }),
  );
}

/**
 * Response 201 - Tạo mới thành công với data.
 * Format: { success: true, data: T, message: string }
 */
export function ApiSuccessCreated<T>(
  type: Type<T>,
  description = 'Tạo mới thành công',
): MethodDecorator & ClassDecorator {
  const decorators: MethodDecorator[] = [ApiExtraModels(type)];

  (decorators as MethodDecorator[]).push(
    ApiResponse({
      status: 201,
      description,
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: description },
          data: { $ref: getSchemaPath(type) },
        },
      },
    }),
  );

  return applyDecorators(...decorators);
}

/**
 * Response paginated với success.
 * Format: { success: true, data: T[], meta: {...} }
 */
export function ApiSuccessPaginated<T>(
  type: Type<T>,
  description = 'Thành công - Trả về danh sách có phân trang',
): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ApiExtraModels(type),
    ApiResponse({
      status: 200,
      description,
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: description },
          data: {
            type: 'array',
            items: { $ref: getSchemaPath(type) },
          },
          meta: {
            type: 'object',
            properties: {
              total: { type: 'integer', example: 100 },
              page: { type: 'integer', example: 1 },
              limit: { type: 'integer', example: 10 },
              totalPages: { type: 'integer', example: 10 },
            },
          },
        },
      },
    }),
  );
}
