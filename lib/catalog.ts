export type CatalogItem = {
  typeKey: string;
  title: string;
  intervalUnit: 'months' | 'years';
  intervalCount: number;
  notifyOffsets: number[];
  notes?: string;
};

export const catalog: CatalogItem[] = [
  {
    typeKey: 'car.rca',
    title: 'RCA masina',
    intervalUnit: 'years',
    intervalCount: 1,
    notifyOffsets: [30, 7, 1, 0]
  },
  {
    typeKey: 'car.itp',
    title: 'ITP masina',
    intervalUnit: 'years',
    intervalCount: 2,
    notifyOffsets: [30, 7, 1, 0],
    notes: 'ITP poate fi ajustat la 1 an pentru masini vechi.'
  },
  {
    typeKey: 'home.boiler_service',
    title: 'Revizie centrala',
    intervalUnit: 'years',
    intervalCount: 1,
    notifyOffsets: [30, 7, 1, 0]
  },
  {
    typeKey: 'home.general_cleaning',
    title: 'Curatenie generala',
    intervalUnit: 'months',
    intervalCount: 3,
    notifyOffsets: [7, 1, 0]
  },
  {
    typeKey: 'docs.passport',
    title: 'Pasaport',
    intervalUnit: 'years',
    intervalCount: 5,
    notifyOffsets: [90, 30, 7, 1, 0],
    notes: 'Valabilitatea poate fi 5 sau 10 ani.'
  },
  {
    typeKey: 'medical.dentist',
    title: 'Dentist',
    intervalUnit: 'months',
    intervalCount: 6,
    notifyOffsets: [30, 7, 1, 0]
  }
];

export function getCatalogItem(typeKey: string) {
  return catalog.find((item) => item.typeKey === typeKey);
}
