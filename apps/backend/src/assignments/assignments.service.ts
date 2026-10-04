import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Tenant } from '@prisma/client';
import { AuditService } from '../common/audit.service';
import { isoDate, monthStart, parseDate } from '../common/dates';
import { outstandingByTenant } from '../common/outstanding';
import { PrismaService } from '../common/prisma.service';
import { AssignmentTermsDto, ChangeRentDto, CreateAssignmentDto, MoveOutDto } from './assignments.dto';

type Tx = Prisma.TransactionClient;

@Injectable()
export class AssignmentsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  /**
   * Puts a tenant into a vacant room inside an existing transaction.
   * The room is claimed atomically (VACANT -> OCCUPIED) so two concurrent requests cannot both succeed;
   * a partial unique index in the database is the final backstop.
   */
  async assignInTx(tx: Tx, tenant: Pick<Tenant, 'id' | 'propertyId'>, terms: AssignmentTermsDto) {
    const room = await tx.room.findFirst({ where: { id: terms.roomId, propertyId: tenant.propertyId }, include: { property: true } });
    if (!room) throw new NotFoundException('Room not found');
    if (room.status === 'OCCUPIED') throw new ConflictException('Room is already occupied');
    if (room.status === 'MAINTENANCE') throw new ConflictException('Room is under maintenance and cannot be assigned');

    const already = await tx.roomAssignment.findFirst({ where: { tenantId: tenant.id, status: 'ACTIVE' } });
    if (already) throw new ConflictException('This tenant already has an active room');

    const claimed = await tx.room.updateMany({ where: { id: room.id, status: 'VACANT' }, data: { status: 'OCCUPIED' } });
    if (claimed.count === 0) throw new ConflictException('Room is already occupied');

    const startDate = parseDate(terms.startDate, 'Start date');
    const mode = terms.electricityMode ?? room.electricityMode;
    const ratePerUnit = mode === 'METER' ? terms.ratePerUnit ?? room.ratePerUnit ?? room.property.defaultRatePerUnit : null;
    const fixedElectricity = mode === 'FIXED' ? terms.fixedElectricity ?? room.fixedElectricity : null;
    if (mode === 'FIXED' && fixedElectricity == null) throw new BadRequestException('Enter the fixed electricity amount');

    const assignment = await tx.roomAssignment.create({
      data: {
        tenantId: tenant.id,
        roomId: room.id,
        startDate,
        agreedRent: terms.agreedRent,
        securityDeposit: terms.securityDeposit ?? 0,
        electricityMode: mode,
        ratePerUnit,
        fixedElectricity,
        initialMeterReading: mode === 'METER' ? terms.initialMeterReading ?? 0 : null,
        notes: terms.notes,
        status: 'ACTIVE',
      },
    });
    await tx.rentHistory.create({ data: { assignmentId: assignment.id, amount: terms.agreedRent, effectiveFrom: monthStart(startDate) } });
    await tx.tenant.update({ where: { id: tenant.id }, data: { status: 'ACTIVE' } });
    return assignment;
  }

  async create(userId: string, dto: CreateAssignmentDto) {
    const tenant = await this.prisma.tenant.findFirst({ where: { id: dto.tenantId, deletedAt: null, property: { ownerId: userId } } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    try {
      const assignment = await this.prisma.$transaction((tx) => this.assignInTx(tx, tenant, dto));
      await this.audit.log(userId, 'assignment.create', 'room_assignment', assignment.id);
      return assignment;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException('Room is already occupied');
      throw e;
    }
  }

  private async ownedAssignment(userId: string, id: string) {
    const a = await this.prisma.roomAssignment.findFirst({ where: { id, room: { property: { ownerId: userId } } }, include: { room: true } });
    if (!a) throw new NotFoundException('Assignment not found');
    return a;
  }

  async moveOut(userId: string, id: string, dto: MoveOutDto) {
    const a = await this.ownedAssignment(userId, id);
    if (a.status !== 'ACTIVE') throw new ConflictException('This tenant has already moved out');
    const endDate = parseDate(dto.moveOutDate, 'Move-out date');
    if (endDate < a.startDate) throw new BadRequestException('Move-out date cannot be before the move-in date');

    if (dto.finalMeterReading != null && a.electricityMode === 'METER') {
      const last = await this.prisma.electricityReading.findFirst({ where: { assignmentId: id }, orderBy: { billingPeriod: 'desc' } });
      const floor = last?.currentReading.toNumber() ?? a.initialMeterReading?.toNumber() ?? 0;
      if (dto.finalMeterReading < floor) throw new BadRequestException(`Final meter reading cannot be lower than the previous reading (${floor})`);
    }

    await this.prisma.$transaction(async (tx) => {
      const closed = await tx.roomAssignment.updateMany({
        where: { id, status: 'ACTIVE' },
        data: { status: 'CLOSED', endDate, finalMeterReading: dto.finalMeterReading, moveOutNotes: dto.notes },
      });
      if (closed.count === 0) throw new ConflictException('This tenant has already moved out');
      await tx.tenant.update({ where: { id: a.tenantId }, data: { status: 'MOVED_OUT' } });
      await tx.room.update({ where: { id: a.roomId }, data: { status: 'VACANT' } });
    });
    await this.audit.log(userId, 'assignment.move_out', 'room_assignment', id, { moveOutDate: isoDate(endDate) });

    const balance = (await outstandingByTenant(this.prisma, [a.tenantId])).get(a.tenantId) ?? 0;
    return { assignmentId: id, tenantId: a.tenantId, roomId: a.roomId, status: 'CLOSED', endDate, finalBalance: balance };
  }

  /** Records a rent change effective from a month. Past bills are never touched. */
  async changeRent(userId: string, id: string, dto: ChangeRentDto) {
    const a = await this.ownedAssignment(userId, id);
    if (a.status !== 'ACTIVE') throw new ConflictException('Rent can only be changed for an active assignment');
    const effectiveFrom = monthStart(parseDate(dto.effectiveFrom, 'Effective date'));
    if (effectiveFrom < monthStart(a.startDate)) throw new BadRequestException('Rent cannot change before the move-in month');

    await this.prisma.$transaction(async (tx) => {
      await tx.rentHistory.upsert({
        where: { assignmentId_effectiveFrom: { assignmentId: id, effectiveFrom } },
        create: { assignmentId: id, amount: dto.amount, effectiveFrom },
        update: { amount: dto.amount },
      });
      const latest = await tx.rentHistory.findFirstOrThrow({ where: { assignmentId: id }, orderBy: { effectiveFrom: 'desc' } });
      await tx.roomAssignment.update({ where: { id }, data: { agreedRent: latest.amount } });
    });
    await this.audit.log(userId, 'assignment.rent_change', 'room_assignment', id, { amount: dto.amount, effectiveFrom: isoDate(effectiveFrom) });
    return this.rentHistory(userId, id);
  }

  async rentHistory(userId: string, id: string) {
    await this.ownedAssignment(userId, id);
    return this.prisma.rentHistory.findMany({ where: { assignmentId: id }, orderBy: { effectiveFrom: 'desc' } });
  }

  async listForTenant(userId: string, tenantId: string) {
    return this.prisma.roomAssignment.findMany({
      where: { tenantId, room: { property: { ownerId: userId } } },
      orderBy: { startDate: 'desc' },
      include: { room: { select: { id: true, roomNumber: true, property: { select: { id: true, name: true } } } } },
    });
  }
}
