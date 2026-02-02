import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetCurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    // Nếu truyền vào key (ví dụ: 'id'), trả về đúng giá trị đó. Nếu không trả về cả object user.
    return data ? user?.[data] : user;
  },
);
