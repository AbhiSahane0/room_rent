import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AssignmentsService } from '../assignments/assignments.service';
import { AuditService } from '../common/audit.service';
import { parseDate } from '../common/dates';
import { outstandingByProperties, outstandingByTenant } from '../common/outstanding';
import { paginate, skipTake } from '../common/pagination';
import { PrismaService } from '../common/prisma.service';
import { PropertiesService } from '../properties/properties.service';
import { CreateTenantDto, ListTenantsQuery, UpdateTenantDto } from './tenants.dto';

const currentAssignmentInclude = {
  where: { status: 'ACTIVE' as const },
  take: 1,
  include: { room: { select: { id: true, roomNumber: true } } },
};

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly properties: PropertiesService,
    private readonly assignments: AssignmentsService,
    private readonly audit: AuditService,
  ) {}

  async assertOwned(userId: string, id: string) {
    const tenant = await this.prisma.tenant.findFirst({ where: { id, deletedAt: null, property: { ownerId: userId } } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async list(userId: string, q: ListTenantsQuery) {
    // Ownership is checked in parallel with the data queries (the response is discarded with a 404 if it fails).
    const propertyIds = q.propertyId ? [q.propertyId] : await this.properties.ownedIds(userId);
    const search = q.search?.trim();
    const where: Prisma.TenantWhereInput = {
      propertyId: { in: propertyIds },
      deletedAt: null,
      ...(q.status ? { status: q.status } : {}),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search.replace(/[\s-]/g, '') } },
              { email: { contains: search, mode: 'insensitive' } },
              { assignments: { some: { room: { roomNumber: { contains: search, mode: 'insensitive' } } } } },
            ],
          }
        : {}),
    };
    const [, total, tenants, balances] = await Promise.all([
      q.propertyId ? this.properties.assertOwned(userId, q.propertyId) : null,
      this.prisma.tenant.count({ where }),
      this.prisma.tenant.findMany({
        relationLoadStrategy: 'join',
        where,
        orderBy: [{ status: 'asc' }, { fullName: 'asc' }],
        ...skipTake(q),
        include: { assignments: currentAssignmentInclude },
      }),
      outstandingByProperties(this.prisma, propertyIds),
    ]);
    const items = tenants.map(({ assignments, ...t }) => {
      const a = assignments[0];
      return {
        id: t.id, fullName: t.fullName, phone: t.phone, email: t.email, status: t.status, joiningDate: t.joiningDate,
        room: a ? { id: a.room.id, roomNumber: a.room.roomNumber } : null,
        assignmentId: a?.id ?? null,
        monthlyRent: a?.agreedRent ?? null,
        balance: balances.get(t.id) ?? 0,
      };
    });
    return paginate(items, total, q);
  }

  async get(userId: string, id: string) {
    const [tenant, balances] = await Promise.all([
    this.prisma.tenant.findFirst({
      relationLoadStrategy: 'join',
      where: { id, deletedAt: null, property: { ownerId: userId } },
      include: {
        property: { select: { id: true, name: true } },
        assignments: {
          orderBy: { startDate: 'desc' },
          include: { room: { select: { id: true, roomNumber: true } }, rents: { orderBy: { effectiveFrom: 'desc' } } },
        },
        documents: { where: { deletedAt: null }, select: { id: true, type: true } },
      },
    }),
    outstandingByTenant(this.prisma, [id]),
    ]);
    if (!tenant) throw new NotFoundException('Tenant not found');
    const { assignments, documents, ...rest } = tenant;
    const active = assignments.find((a) => a.status === 'ACTIVE') ?? null;
    const balance = balances.get(id) ?? 0;
    return {
      ...rest,
      currentAssignment: active && {
        id: active.id, room: active.room, startDate: active.startDate, agreedRent: active.agreedRent, securityDeposit: active.securityDeposit,
        electricityMode: active.electricityMode, ratePerUnit: active.ratePerUnit, fixedElectricity: active.fixedElectricity,
        initialMeterReading: active.initialMeterReading, rents: active.rents,
      },
      // The latest assignment, used for the summary when the tenant has moved out
      lastAssignment: active ? null : assignments[0] && { id: assignments[0].id, room: assignments[0].room, startDate: assignments[0].startDate, endDate: assignments[0].endDate, agreedRent: assignments[0].agreedRent, securityDeposit: assignments[0].securityDeposit },
      roomHistory: assignments.map((a) => ({
        assignmentId: a.id, room: a.room, startDate: a.startDate, endDate: a.endDate, agreedRent: a.agreedRent,
        securityDeposit: a.securityDeposit, status: a.status, finalMeterReading: a.finalMeterReading, moveOutNotes: a.moveOutNotes,
      })),
      documentTypes: documents.map((d) => d.type),
      outstanding: balance,
    };
  }

  async create(userId: string, dto: CreateTenantDto) {
    const { assignment, propertyId: requestedProperty, joiningDate, ...fields } = dto;
    let propertyId = requestedProperty;
    if (assignment) {
      const room = await this.prisma.room.findFirst({ where: { id: assignment.roomId, property: { ownerId: userId } }, select: { propertyId: true } });
      if (!room) throw new NotFoundException('Room not found');
      if (propertyId && propertyId !== room.propertyId) throw new BadRequestException('Room does not belong to that property');
      propertyId = room.propertyId;
    }
    if (!propertyId) throw new BadRequestException('Select a property for this tenant');
    await this.properties.assertOwned(userId, propertyId);
    const joined = parseDate(joiningDate, 'Joining date');

    try {
      const tenant = await this.prisma.$transaction(async (tx) => {
        const created = await tx.tenant.create({ data: { ...fields, propertyId: propertyId!, joiningDate: joined, status: 'ACTIVE' } });
        if (assignment) await this.assignments.assignInTx(tx, created, assignment);
        return created;
      });
      await this.audit.log(userId, 'tenant.create', 'tenant', tenant.id);
      return this.get(userId, tenant.id);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException('Room is already occupied');
      throw e;
    }
  }

  async update(userId: string, id: string, dto: UpdateTenantDto) {
    await this.assertOwned(userId, id);
    const { joiningDate, ...rest } = dto;
    await this.prisma.tenant.update({ where: { id }, data: { ...rest, ...(joiningDate ? { joiningDate: parseDate(joiningDate, 'Joining date') } : {}) } });
    await this.audit.log(userId, 'tenant.update', 'tenant', id);
    return this.get(userId, id);
  }

  /** Soft delete: hides the tenant but keeps assignments, bills and payments intact. */
  async remove(userId: string, id: string) {
    await this.assertOwned(userId, id);
    const active = await this.prisma.roomAssignment.findFirst({ where: { tenantId: id, status: 'ACTIVE' } });
    if (active) throw new ConflictException('Move the tenant out before deleting their record');
    await this.prisma.tenant.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.log(userId, 'tenant.delete', 'tenant', id);
    return null;
  }
}
