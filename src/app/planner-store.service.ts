import { computed, inject, Injectable, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { PlannerApiService, PlannerPayload } from './planner-api.service';

export interface InvestmentItem {
  name: string;
  amount: number;
  actuals?: Record<string, number>;
}
export interface InvestmentCategory {
  name: string;
  color: string;
  items: InvestmentItem[];
}

@Injectable({ providedIn: 'root' })
export class PlannerStore {
  private readonly api = inject(PlannerApiService);
  private readonly auth = inject(AuthService);
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
  private readonly ownerStorageKey = 'folio-planner-owner';
  private readonly salaryStorageKey = 'folio-monthly-salary';
  private readonly otherIncomeStorageKey = 'folio-monthly-other-income';
  private readonly arrearsStorageKey = 'folio-monthly-arrears';
  private readonly updatedAtStorageKey = 'folio-month-plan-updated-at';
  readonly activeMonth = signal(this.currentMonth);
  readonly monthPlans = signal<Record<string, InvestmentCategory[]>>(
    this.loadMonthPlans(),
  );
  readonly categories = computed(
    () => this.monthPlans()[this.activeMonth()] ?? [],
  );
  readonly salaries = signal<Record<string, number>>(this.loadSalaries());
  readonly otherIncomes = signal<Record<string, number>>(this.loadOtherIncomes());
  readonly arrears = signal<Record<string, number>>(this.loadArrears());
  readonly lastPlanUpdatedAt = signal<string | undefined>(
    this.loadLastPlanUpdatedAt(),
  );
  readonly syncStatus = signal<'local' | 'loading' | 'saving' | 'synced' | 'error'>(
    'local',
  );
  private hasRemotePlanner = false;
  private hydrating = false;
  private saveTimer: ReturnType<typeof setTimeout> | undefined;
  private saveQueue: Promise<void> = Promise.resolve();
  readonly total = computed(() =>
    this.totalFor(this.activeMonth()),
  );
  readonly investmentTotal = computed(() =>
    this.investmentTotalFor(this.activeMonth()),
  );
  readonly commitments = computed(() => this.total() - this.investmentTotal());
  readonly itemCount = computed(() =>
    this.categories().reduce((sum, category) => sum + category.items.length, 0),
  );

  private loadMonthPlans(): Record<string, InvestmentCategory[]> {
    const defaultPlans: Record<string, InvestmentCategory[]> = {
      January: this.screenshotPlan(),
    };
    if (typeof localStorage === 'undefined') return defaultPlans;
    try {
      localStorage.removeItem('undefined');
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Migrate the old shared plan to independent monthly copies.
          const legacy = parsed as InvestmentCategory[];
          const migrated: Record<string, InvestmentCategory[]> = {};
          for (const month of this.months) {
            migrated[month.name] = this.clonePlan(legacy, month.name, true);
          }
          localStorage.setItem(this.storageKey, JSON.stringify(migrated));
          return migrated;
        }
        if (parsed && typeof parsed === 'object') {
          return parsed as Record<string, InvestmentCategory[]>;
        }
      }
      localStorage.setItem(this.storageKey, JSON.stringify(defaultPlans));
      return defaultPlans;
    } catch {
      localStorage.setItem(this.storageKey, JSON.stringify(defaultPlans));
      return defaultPlans;
    }
  }

  private clonePlan(
    categories: InvestmentCategory[],
    month: string,
    preserveActual = false,
  ): InvestmentCategory[] {
    return categories.map((category) => ({
      ...category,
      items: category.items.map((item) => ({
        ...item,
        actuals:
          preserveActual && item.actuals?.[month] !== undefined
            ? { [month]: item.actuals[month] }
            : {},
      })),
    }));
  }

  setActiveMonth(month: string): void {
    this.activeMonth.set(month);
    this.ensureMonthPlan(month);
  }

  private ensureMonthPlan(month: string): InvestmentCategory[] {
    const plans = this.monthPlans();
    if (plans[month]?.length) return plans[month];

    const monthIndex = this.months.findIndex((entry) => entry.name === month);
    let source: InvestmentCategory[] | undefined;
    for (let index = monthIndex - 1; index >= 0; index--) {
      const previousPlan = plans[this.months[index].name];
      if (previousPlan?.length) {
        source = previousPlan;
        break;
      }
    }
    const copiedPlan = this.clonePlan(source ?? [], month);
    this.monthPlans.update((current) => ({ ...current, [month]: copiedPlan }));
    this.persist();
    return copiedPlan;
  }

  private screenshotPlan(): InvestmentCategory[] {
    return [
      {
        name: 'Fixed Commitments',
        color: 'mint',
        items: [],
      },
      {
        name: 'Household expenses',
        color: 'blue',
        items: [],
      },
      {
        name: 'Investment & Savings',
        color: 'orange',
        items: [],
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

  private loadOtherIncomes(): Record<string, number> {
    if (typeof localStorage === 'undefined') return {};
    try {
      const saved = localStorage.getItem(this.otherIncomeStorageKey);
      if (!saved) return {};
      const parsed: unknown = JSON.parse(saved);
      return parsed && typeof parsed === 'object'
        ? (parsed as Record<string, number>)
        : {};
    } catch {
      return {};
    }
  }

  private loadArrears(): Record<string, number> {
    if (typeof localStorage === 'undefined') return {};
    try {
      const saved = localStorage.getItem(this.arrearsStorageKey);
      if (!saved) return {};
      const parsed: unknown = JSON.parse(saved);
      return parsed && typeof parsed === 'object'
        ? (parsed as Record<string, number>)
        : {};
    } catch {
      return {};
    }
  }

  private loadLastPlanUpdatedAt(): string | undefined {
    if (typeof localStorage === 'undefined') return undefined;
    try {
      const saved = localStorage.getItem(this.updatedAtStorageKey);
      if (!saved) return undefined;
      const parsed: unknown = JSON.parse(saved);
      if (typeof parsed === 'string') return parsed;
      if (parsed && typeof parsed === 'object') {
        return Object.values(parsed as Record<string, string>)
          .filter((value) => !Number.isNaN(new Date(value).getTime()))
          .sort()
          .at(-1);
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  async loadFromBackend(): Promise<void> {
    this.hydrating = true;
    this.syncStatus.set('loading');
    try {
      let planner: PlannerPayload;
      try {
        planner = await this.api.getPlanner();
        this.hasRemotePlanner = true;
      } catch (error) {
        if ((error as { status?: number })?.status !== 404) throw error;
        const owner =
          typeof localStorage === 'undefined'
            ? null
            : localStorage.getItem(this.ownerStorageKey);
        const canMigrateLocal = !owner || owner === this.auth.email();
        planner = await this.api.createPlanner(
          canMigrateLocal
            ? this.toPayload()
            : { monthPlans: {}, salaries: {}, otherIncomes: {}, arrears: {} },
        );
        this.hasRemotePlanner = true;
      }
      const backendSupportsArrears = this.hasArrearsField(planner);
      this.applyPlanner(planner);
      this.persistLocal();
      this.syncStatus.set(backendSupportsArrears ? 'synced' : 'error');
    } catch (error) {
      this.syncStatus.set('error');
      throw error;
    } finally {
      this.hydrating = false;
    }
  }

  stopBackendSync(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = undefined;
    this.hasRemotePlanner = false;
    this.syncStatus.set('local');
  }

  private applyPlanner(planner: PlannerPayload): void {
    const existingPlans = this.monthPlans();
    const colors = ['mint', 'blue', 'orange'];
    const plans = Object.fromEntries(
      Object.entries(planner.monthPlans ?? {}).map(([month, monthPlan]) => [
        month,
        (monthPlan.categories ?? []).map((category, index) => ({
          name: category.name,
          color:
            existingPlans[month]?.find((current) => current.name === category.name)
              ?.color ?? colors[index % colors.length],
          items: (category.items ?? []).map((item) => ({
            ...item,
            actuals: item.actuals ?? {},
          })),
        })),
      ]),
    );
    this.monthPlans.set(plans);
    this.salaries.set(planner.salaries ?? {});
    this.otherIncomes.set(planner.otherIncomes ?? {});
    this.arrears.set(planner.arrears ?? this.arrears());
    this.lastPlanUpdatedAt.set(planner.lastUpdatedUtc);
  }

  private hasArrearsField(planner: PlannerPayload): boolean {
    return Object.hasOwn(planner, 'arrears');
  }

  private toPayload(): PlannerPayload {
    const monthPlans = Object.fromEntries(
      Object.entries(this.monthPlans()).map(([month, categories]) => [
        month,
        {
          categories: categories
            .filter((category) => category.name.trim())
            .map((category) => ({
              name: category.name.trim(),
              items: category.items
                .filter((item) => item.name.trim())
                .map((item) => ({
                  name: item.name.trim(),
                  amount: item.amount,
                  actuals: item.actuals ?? {},
                })),
            })),
        },
      ]),
    );
    return {
      monthPlans,
      salaries: this.salaries(),
      otherIncomes: this.otherIncomes(),
      arrears: this.arrears(),
    };
  }

  private scheduleBackendSave(): void {
    if (!this.auth.authenticated() || this.hydrating) return;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      const payload = this.toPayload();
      this.saveQueue = this.saveQueue
        .catch(() => undefined)
        .then(async () => {
          this.syncStatus.set('saving');
          try {
            const updated = this.hasRemotePlanner
              ? await this.api.updatePlanner(payload)
              : await this.api.createPlanner(payload);
            this.hasRemotePlanner = true;
            if (!this.hasArrearsField(updated)) {
              this.syncStatus.set('error');
              return;
            }
            this.lastPlanUpdatedAt.set(updated.lastUpdatedUtc);
            this.syncStatus.set('synced');
          } catch {
            this.syncStatus.set('error');
          }
        });
    }, 400);
  }

  categoryTotal(category: InvestmentCategory | undefined): number {
    return (
      category?.items.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0,
      ) ?? 0
    );
  }
  totalFor(month: string): number {
    return (this.monthPlans()[month] ?? []).reduce(
      (sum, category) => sum + this.categoryTotal(category),
      0,
    );
  }
  investmentTotalFor(month: string): number {
    return this.categoryTotal(
      this.monthPlans()[month]?.find(
        (category) => category.name === 'Investment & Savings',
      ),
    );
  }
  itemActualFor(item: InvestmentItem, month: string): number {
    return item.actuals?.[month] ?? 0;
  }
  categoryActualTotal(
    category: InvestmentCategory | undefined,
    month: string,
  ): number {
    return (
      category?.items.reduce(
        (sum, item) => sum + this.itemActualFor(item, month),
        0,
      ) ?? 0
    );
  }
  actualTotalFor(month: string): number {
    return (this.monthPlans()[month] ?? []).reduce(
      (sum, category) => sum + this.categoryActualTotal(category, month),
      0,
    );
  }
  formatUpdatedDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Date unavailable'
      : new Intl.DateTimeFormat('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(date);
  }
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(
      value,
    );
  }
  limitAmount(value: number | string): number {
    return Math.min(9_999_999, Math.max(0, Number(value) || 0));
  }
  salaryFor(month: string): number {
    return this.salaries()[month] ?? 0;
  }
  otherIncomeFor(month: string): number {
    return this.otherIncomes()[month] ?? 0;
  }
  arrearsFor(month: string): number {
    return this.arrears()[month] ?? 0;
  }
  totalIncomeFor(month: string): number {
    return (
      this.salaryFor(month) +
      this.otherIncomeFor(month) +
      this.arrearsFor(month)
    );
  }
  hasIncomeFor(month: string): boolean {
    return this.totalIncomeFor(month) > 0;
  }
  availableBalanceFor(month: string): number {
    return this.hasIncomeFor(month)
      ? this.totalIncomeFor(month) - this.totalFor(month)
      : 0;
  }
  actualBalanceFor(month: string): number {
    return this.hasIncomeFor(month)
      ? this.totalIncomeFor(month) - this.actualTotalFor(month)
      : 0;
  }
  setActual(item: InvestmentItem, month: string, value: number | string): void {
    const actual = this.limitAmount(value);
    item.actuals = { ...item.actuals, [month]: actual };
    this.refresh();
  }
  setBudgetAmount(item: InvestmentItem, value: number | string): void {
    item.amount = this.limitAmount(value);
    this.refresh();
  }
  setSalary(month: string, value: number | string): void {
    const salary = this.limitAmount(value);
    this.salaries.update((salaries) => ({ ...salaries, [month]: salary }));
    if (typeof localStorage !== 'undefined')
      localStorage.setItem(
        this.salaryStorageKey,
        JSON.stringify(this.salaries()),
      );
    this.markLastUpdated();
    this.persistLocal();
    this.scheduleBackendSave();
  }
  setOtherIncome(month: string, value: number | string): void {
    const income = this.limitAmount(value);
    this.otherIncomes.update((incomes) => ({ ...incomes, [month]: income }));
    if (typeof localStorage !== 'undefined')
      localStorage.setItem(
        this.otherIncomeStorageKey,
        JSON.stringify(this.otherIncomes()),
      );
    this.markLastUpdated();
    this.persistLocal();
    this.scheduleBackendSave();
  }
  setArrears(month: string, value: number | string): void {
    const amount = this.limitAmount(value);
    this.arrears.update((arrears) => ({ ...arrears, [month]: amount }));
    if (typeof localStorage !== 'undefined')
      localStorage.setItem(
        this.arrearsStorageKey,
        JSON.stringify(this.arrears()),
      );
    this.markLastUpdated();
    this.persistLocal();
    this.scheduleBackendSave();
  }
  clearPlan(): void {
    this.monthPlans.set({});
    this.salaries.set({});
    this.otherIncomes.set({});
    this.arrears.set({});
    this.lastPlanUpdatedAt.set(undefined);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, '{}');
      localStorage.setItem(this.salaryStorageKey, '{}');
      localStorage.setItem(this.otherIncomeStorageKey, '{}');
      localStorage.setItem(this.arrearsStorageKey, '{}');
      localStorage.setItem(this.updatedAtStorageKey, '{}');
    }
    this.scheduleBackendSave();
  }
  addCategory(): void {
    const month = this.activeMonth();
    const categories = this.ensureMonthPlan(month);
    this.monthPlans.update((plans) => ({
      ...plans,
      [month]: [...categories, { name: '', color: 'blue', items: [] }],
    }));
    this.persist(true);
  }
  removeCategory(category: InvestmentCategory): void {
    const month = this.activeMonth();
    this.monthPlans.update((plans) => ({
      ...plans,
      [month]: (plans[month] ?? []).filter((item) => item !== category),
    }));
    this.persist(true);
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
    const month = this.activeMonth();
    this.monthPlans.update((plans) => ({
      ...plans,
      [month]: [...(plans[month] ?? [])],
    }));
    this.persist(true);
  }
  private persist(markUpdated = false): void {
    if (markUpdated) this.markLastUpdated();
    this.persistLocal();
    this.scheduleBackendSave();
  }

  private persistLocal(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(this.monthPlans()));
      localStorage.setItem(this.salaryStorageKey, JSON.stringify(this.salaries()));
      localStorage.setItem(this.otherIncomeStorageKey, JSON.stringify(this.otherIncomes()));
      localStorage.setItem(this.arrearsStorageKey, JSON.stringify(this.arrears()));
      localStorage.setItem(
        this.updatedAtStorageKey,
        JSON.stringify(this.lastPlanUpdatedAt()),
      );
      const owner = this.auth.email();
      if (owner) localStorage.setItem(this.ownerStorageKey, owner);
    }
  }

  private markLastUpdated(): void {
    const timestamp = new Date().toISOString();
    this.lastPlanUpdatedAt.set(timestamp);
    if (typeof localStorage !== 'undefined')
      localStorage.setItem(this.updatedAtStorageKey, JSON.stringify(timestamp));
  }
}
