import { BadRequestException, ValidationError, ValidationPipe } from '@nestjs/common';

function flatten(errors: ValidationError[], parent = '', out: Record<string, string[]> = {}) {
  for (const e of errors) {
    const path = parent ? `${parent}.${e.property}` : e.property;
    if (e.constraints) out[path] = Object.values(e.constraints);
    if (e.children?.length) flatten(e.children, path, out);
  }
  return out;
}

export const createValidationPipe = () =>
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
    exceptionFactory: (errors) => {
      const map = flatten(errors);
      const first = Object.values(map)[0]?.[0] ?? 'Invalid request';
      return new BadRequestException({ message: first, errors: map });
    },
  });
