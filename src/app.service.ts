import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as ExcelJS from 'exceljs';
import { createId } from '@paralleldrive/cuid2';

// Datos iniciales copiados de tu frontend (simplificados para el ejemplo)
// IMPORTANTE: Asegúrate de copiar aquí el array completo de tu archivo data.ts
const INITIAL_DATA: Prisma.InitiativeCreateInput[] = [
  {
    id: 'init-op-001',
    stream: 'Finance',
    workType: 'Operative Initiative',
    itBusinessPartner: 'Andy Sánchez',
    workName: 'Finance Dashboard PowerBI',
    priority: 'Nice to Have',
    classification: 'Report',
    hours: { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 },
    assignedQuarters: [],
  },
  // ... (Copia el resto de tus iniciativas aquí) ...
  // Para las que son Proyectos y ya tienen horas, asegúrate de poner el assignedQuarters correcto
  // Ejemplo:
  {
    id: 'init-cp-001',
    stream: 'Sales',
    workType: 'SP Company Project',
    itBusinessPartner: 'Andy Sánchez',
    workName: 'Sales Force Automation AI',
    priority: 'Must Have',
    classification: 'AI',
    hours: { q1: 100, q2: 0, q3: 0, q4: 0, total: 100 },
    assignedQuarters: ['q1'],
  },
];

@Injectable()
export class AppService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  // Al iniciar, si la BD está vacía, la llenamos
  async onModuleInit() {
    const count = await this.prisma.initiative.count();
    if (count === 0) {
      console.log('Base de datos vacía. Sembrando datos iniciales...');
      await this.resetData();
    }
  }

  async findAll() {
    return this.prisma.initiative.findMany();
  }

  async update(id: string, data: Prisma.InitiativeUpdateInput) {
    // Si se envían horas, recalculamos el total y los quarters asignados automáticamente
    if (data.hours) {
      const h = data.hours as any;
      const q1 = Number(h.q1) || 0;
      const q2 = Number(h.q2) || 0;
      const q3 = Number(h.q3) || 0;
      const q4 = Number(h.q4) || 0;
      const total = q1 + q2 + q3 + q4;

      data.hours = { q1, q2, q3, q4, total };

      const assignedQuarters: string[] = [];
      if (q1 > 0) assignedQuarters.push('q1');
      if (q2 > 0) assignedQuarters.push('q2');
      if (q3 > 0) assignedQuarters.push('q3');
      if (q4 > 0) assignedQuarters.push('q4');

      data.assignedQuarters = assignedQuarters;
    }

    return this.prisma.initiative.update({
      where: { id },
      data, // Prisma maneja partial updates automáticamente si el tipo es correcto
    });
  }

  async resetData() {
    // Borramos todo
    await this.prisma.initiative.deleteMany();
    // Insertamos los datos iniciales
    // Nota: createMany no es soportado en SQLite, pero sí en Postgres
    await this.prisma.initiative.createMany({
      data: INITIAL_DATA,
    });
    return { message: 'Datos reseteados correctamente' };
  }

  async importData(file: Express.Multer.File) {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    const initiatives = jsonData.map((row: any) => {
      const q1 = Number(row['Q1']) || 0;
      const q2 = Number(row['Q2']) || 0;
      const q3 = Number(row['Q3']) || 0;
      const q4 = Number(row['Q4']) || 0;
      const total = q1 + q2 + q3 + q4;

      // Calculamos automáticamente los quarters asignados si tienen horas > 0
      const assignedQuarters: string[] = [];
      if (q1 > 0) assignedQuarters.push('q1');
      if (q2 > 0) assignedQuarters.push('q2');
      if (q3 > 0) assignedQuarters.push('q3');
      if (q4 > 0) assignedQuarters.push('q4');

      return {
        id: createId(),
        stream: row['Stream'] || '',
        workType: row['Work Type'] || '',
        itBusinessPartner: row['Users'] || '',
        workName: row['Work Name'] || '',
        priority: row['Priority'] || '',
        classification: row['Classification'] || '',
        hours: { q1, q2, q3, q4, total },
        assignedQuarters,
      };
    });

    if (initiatives.length > 0) {
      // Borramos los datos anteriores antes de insertar los nuevos
      await this.prisma.initiative.deleteMany();

      await this.prisma.initiative.createMany({
        data: initiatives,
      });
    }

    return {
      message: `${initiatives.length} iniciativas importadas correctamente`,
    };
  }

  async exportData() {
    const initiatives = await this.prisma.initiative.findMany({
      orderBy: { id: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Planning');

    // 1. Definir columnas y encabezados (incluye anchos)
    worksheet.columns = [
      { header: 'Stream', key: 'stream', width: 15 },
      { header: 'Work Type', key: 'workType', width: 20 },
      { header: 'Work Name', key: 'workName', width: 30 },
      { header: 'Users', key: 'users', width: 20 },
      { header: 'Priority', key: 'priority', width: 15 },
      { header: 'Classification', key: 'classification', width: 15 },
      { header: 'Q1', key: 'q1', width: 8 },
      { header: 'Q2', key: 'q2', width: 8 },
      { header: 'Q3', key: 'q3', width: 8 },
      { header: 'Q4', key: 'q4', width: 8 },
      { header: 'Total', key: 'total', width: 10 },
    ];

    // 2. Estilizar encabezado (Fila 1)
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' }, // Gris claro
    };
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // 3. Agregar datos y bordes
    initiatives.forEach((item) => {
      const hours = item.hours as any;
      const row = worksheet.addRow({
        stream: item.stream,
        workType: item.workType,
        workName: item.workName,
        users: item.itBusinessPartner,
        priority: item.priority,
        classification: item.classification,
        q1: hours?.q1 ?? 0,
        q2: hours?.q2 ?? 0,
        q3: hours?.q3 ?? 0,
        q4: hours?.q4 ?? 0,
        total: hours?.total ?? 0,
      });

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }
}
