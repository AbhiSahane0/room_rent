import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const RESPONSE_MESSAGE = 'responseMessage';
export const ResponseMessage = (message: string) => SetMetadata(RESPONSE_MESSAGE, message);

export interface AuthUser {
  userId: string;
  sessionId: string;
  username: string;
}

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  return ctx.switchToHttp().getRequest().user;
});
