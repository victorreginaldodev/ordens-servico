const COMPANY_KEY = 'servix_company';

export interface Company {
  id: string;
  name: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  address?: string;
  logo?: string;
}

const read = <T,>(key: string, fallback: T): T => {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const write = (key: string, value: unknown) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const seedData = () => {
  const existingCompany = read<Company | null>(COMPANY_KEY, null);
  if (!existingCompany) {
    const company: Company = {
      id: 'c1',
      name: 'Minha Empresa',
      cnpj: '00.000.000/0000-00',
      email: 'contato@empresa.com',
      phone: '(11) 99999-0000',
      address: 'Rua Exemplo, 123 - São Paulo/SP',
      logo: '',
    };
    write(COMPANY_KEY, company);
  }
};

seedData();

export const getCompany = (): Company => read<Company>(COMPANY_KEY, { id: 'c1', name: '' });
export const setCompany = (company: Company) => write(COMPANY_KEY, company);
