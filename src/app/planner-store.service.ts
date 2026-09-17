import { computed, Injectable, signal } from '@angular/core';

export interface InvestmentItem {
  name: string;
  amount: number;
}
export interface InvestmentCategory {
  name: string;
  color: string;
  items: InvestmentItem[];
}

@Injectable({ providedIn: 'root' })
export class PlannerStore {
  readonly currentYear = new Date().getFullYear();
  readonly months = [
    { name: 'January', short: 'JAN' },
    { name: 'February', short: 'FEB' },
    { name: 'March', short: 'MAR' },
    { name: 'April', short: 'APR' },
    { name: 'May', short: 'MAY' },
    { name: 'June', short: 'JUN' },
    { name: 'July', short: 'JUL' },
    { name: 'August', short: 'AUG' },
    { name: 'September', short: 'SEP' },
    { name: 'October', short: 'OCT' },
    { name: 'November', short: 'NOV' },
    { name: 'December', short: 'DEC' },
  ];
  readonly currentMonth =
    this.months[new Date().getMonth()]?.name ?? this.months[0].name;
  private readonly storageKey = 'folio-investment-plan';
  private readonly salaryStorageKey = 'folio-monthly-salary';
  readonly categories = signal<InvestmentCategory[]>(this.loadCategories());
  readonly salaries = signal<Record<string, number>>(this.loadSalaries());
  readonly total = computed(() =>
    this.categories().reduce(
      (sum, category) => sum + this.categoryTotal(category),
      0,
    ),
  );
  readonly investmentTotal = computed(() =>
    this.categoryTotal(
      this.categories().find(
        (category) => category.name === 'Investment & Savings',
      ),
    ),
  );
  readonly commitments = computed(() => this.total() - this.investmentTotal());
  readonly itemCount = computed(() =>
    this.categories().reduce((sum, category) => sum + category.items.length, 0),
  );

  private loadCategories(): InvestmentCategory[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      localStorage.removeItem('undefined');
      const saved = localStorage.getItem(this.storageKey);
      if (saved) return JSON.parse(saved) as InvestmentCategory[];
      const initialPlan = this.screenshotPlan();
      localStorage.setItem(this.storageKey, JSON.stringify(initialPlan));
      return initialPlan;
    } catch {
      const initialPlan = this.screenshotPlan();
      localStorage.setItem(this.storageKey, JSON.stringify(initialPlan));
      return initialPlan;
    }
  }

  private screenshotPlan(): InvestmentCategory[] {
    return [
      {
        name: 'Fixed Commitments',
        color: 'mint',
        items: [
          { name: 'Home Loan EMI', amount: 35700 },
          { name: 'Home Loan Repayment', amount: 12000 },
          { name: "Anvi School Fee's", amount: 8062 },
          { name: 'House Maintenance', amount: 2375 },
          { name: 'SSY', amount: 500 },
          { name: 'LIC', amount: 3000 },
          { name: 'Vehicle Loan', amount: 4134 },
          { name: 'Credit Card bill', amount: 2500 },
        ],
      },
      {
        name: 'Household expenses',
        color: 'blue',
        items: [
          { name: 'House Budget', amount: 16000 },
          { name: 'EV Recharge', amount: 500 },
          { name: 'Travelling', amount: 2500 },
          { name: 'Food and Other', amount: 2000 },
        ],
      },
      {
        name: 'Investment & Savings',
        color: 'orange',
        items: [
          { name: 'RD', amount: 20000 },
          { name: 'SIP', amount: 2000 },
          { name: 'NPS', amount: 0 },
          { name: 'LIC', amount: 3000 },
        ],
      },
    ];
  }

  private loadSalaries(): Record<string, number> {
    if (typeof localStorage === 'undefined') return {};
    const saved = localStorage.getItem(this.salaryStorageKey);
    if (!saved) return {};
    try {
      const parsed = JSON.parse(saved) as Record<string, number>;
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      const legacySalary = Number(saved);
      if (Number.isFinite(legacySalary) && legacySalary > 0)
        return { [this.currentMonth]: legacySalary };
    }
    return {};
  }

  categoryTotal(category: InvestmentCategory | undefined): number {
    return (
      category?.items.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0,
      ) ?? 0
    );
  }
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(
      value,
    );
  }
  salaryFor(month: string): number {
    return this.salaries()[month] ?? 0;
  }
  hasSalaryFor(month: string): boolean {
    return this.salaryFor(month) > 0;
  }
  availableBalanceFor(month: string): number {
    return this.hasSalaryFor(month) ? this.salaryFor(month) - this.total() : 0;
  }
  setSalary(month: string, value: number | string): void {
    const salary = Math.max(0, Number(value) || 0);
    this.salaries.update((salaries) => ({ ...salaries, [month]: salary }));
    if (typeof localStorage !== 'undefined')
      localStorage.setItem(
        this.salaryStorageKey,
        JSON.stringify(this.salaries()),
      );
  }
  clearPlan(): void {
    this.categories.set([]);
    this.salaries.set({});
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, '[]');
      localStorage.setItem(this.salaryStorageKey, '{}');
    }
  }
  addCategory(): void {
    this.categories.update((items) => [
      ...items,
      { name: '', color: 'blue', items: [] },
    ]);
    this.persist();
  }
  removeCategory(category: InvestmentCategory): void {
    this.categories.update((items) =>
      items.filter((item) => item !== category),
    );
    this.persist();
  }
  addItem(category: InvestmentCategory): void {
    category.items.push({ name: '', amount: 0 });
    this.refresh();
  }
  removeItem(category: InvestmentCategory, item: InvestmentItem): void {
    category.items = category.items.filter((current) => current !== item);
    this.refresh();
  }
  refresh(): void {
    this.categories.update((items) => [...items]);
    this.persist();
  }
  private persist(): void {
    if (typeof localStorage !== 'undefined')
      localStorage.setItem(this.storageKey, JSON.stringify(this.categories()));
  }
}
