import type { AdminEventType } from './adminApi';
import type { ReservationDependent, ReservationRow } from '../types/reservations';

const columns: Array<keyof ReservationRow> = [
  'attendingDependents',
  'checkMailDate',
  'checkMailDateChile',
  'createdAt',
  'createdAtChile',
  'eventType',
  'fechaHoraChile',
  'idguardian',
  'isCheckedIn',
  'scheduleId',
  'state_reserve',
  'totalSpotsConsumed',
  'correo',
  'nombre',
  'rut',
  'telefono',
];

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formatDependent(dependent: ReservationDependent) {
  const entries = Object.entries(dependent).filter(([, value]) => value !== null && value !== undefined && value !== '');
  return `{${entries.map(([key, value]) => `${key}=${String(value)}`).join(', ')}}`;
}

function cellValue(value: ReservationRow[keyof ReservationRow]) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return `[${value.map(formatDependent).join(', ')}]`;
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return String(value);
}

function cell(value: string) {
  return `<Cell><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
}

function row(cells: string[]) {
  return `<Row>${cells.map(cell).join('')}</Row>`;
}

function worksheet(name: string, rows: string[]) {
  return `<Worksheet ss:Name="${escapeXml(name)}"><Table>${rows.join('')}</Table></Worksheet>`;
}

function buildQuery(eventType: AdminEventType) {
  return `db.reservations.aggregate([
  {
    $match: {
      eventType: "${eventType}"
    }
  },
  {
    $addFields: {
      guardianObjId: {
        $convert: {
          input: "$guardianId",
          to: "objectId",
          onError: null,
          onNull: null
        }
      },
      scheduleObjId: {
        $convert: {
          input: "$scheduleId",
          to: "objectId",
          onError: null,
          onNull: null
        }
      }
    }
  },
  {
    $lookup: {
      from: "guardians",
      localField: "guardianObjId",
      foreignField: "_id",
      as: "guardian"
    }
  },
  {
    $unwind: {
      path: "$guardian",
      preserveNullAndEmptyArrays: true
    }
  },
  {
    $lookup: {
      from: "schedules",
      localField: "scheduleObjId",
      foreignField: "_id",
      as: "schedule"
    }
  },
  {
    $unwind: {
      path: "$schedule",
      preserveNullAndEmptyArrays: true
    }
  },
  {
    $addFields: {
      sortFechaHora: "$schedule.startTime"
    }
  },
  {
    $sort: {
      sortFechaHora: 1
    }
  },
  {
    $replaceRoot: {
      newRoot: {
        idguardian: "$guardianId",
        nombre: "$guardian.name",
        rut: "$guardian.rut",
        correo: "$guardian.email",
        telefono: "$guardian.phone",
        eventType: "$eventType",
        scheduleId: "$scheduleId",
        state_reserve: "$state_reserve",
        isCheckedIn: "$isCheckedIn",
        attendingDependents: "$attendingDependents",
        totalSpotsConsumed: "$totalSpotsConsumed",
        fechaHoraChile: {
          $cond: [
            { $ifNull: ["$schedule.startTime", false] },
            {
              $dateToString: {
                date: "$schedule.startTime",
                timezone: "America/Santiago",
                format: "%d-%m-%Y %H:%M:%S"
              }
            },
            null
          ]
        },
        checkMailDateChile: {
          $cond: [
            { $ifNull: ["$checkMailDate", false] },
            {
              $dateToString: {
                date: "$checkMailDate",
                timezone: "America/Santiago",
                format: "%d-%m-%Y %H:%M:%S"
              }
            },
            null
          ]
        },
        createdAtChile: {
          $cond: [
            { $ifNull: ["$createdAt", false] },
            {
              $dateToString: {
                date: "$createdAt",
                timezone: "America/Santiago",
                format: "%d-%m-%Y %H:%M:%S"
              }
            },
            null
          ]
        },
        checkMailDate: "$checkMailDate",
        createdAt: "$createdAt"
      }
    }
  }
]);`;
}

export function exportReservationsExcel(rows: ReservationRow[], eventType: AdminEventType) {
  const dataRows = [
    row(columns.map(String)),
    ...rows.map((reservation) => row(columns.map((column) => cellValue(reservation[column])))),
  ];

  const queryRows = [row([buildQuery(eventType)])];

  const workbook = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook
  xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  ${worksheet('Result 1', dataRows)}
  ${worksheet('Query', queryRows)}
</Workbook>`;

  const blob = new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `reservas-${eventType}-${stamp}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
