import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { PlannerApiService } from './planner-api.service';
import { PlannerStore, InvestmentCategory } from './planner-store.service';

describe('PlannerStore monthly plans', () => {
  let store: PlannerStore;

  beforeEach(() => {
    localStorage.setItem(
      'folio-investment-plan',
      JSON.stringify({
        January: [
          {
            name: 'Investments',
            color: 'mint',
            items: [{ name: 'Index fund', amount: 1500 }],
          } satisfies InvestmentCategory,
        ],
        February: [],
      }),
    );
    TestBed.configureTestingModule({
      providers: [
        PlannerStore,
        { provide: PlannerApiService, useValue: {} },
        {
          provide: AuthService,
          useValue: { authenticated: () => false, email: () => null },
        },
      ],
    });
    store = TestBed.inject(PlannerStore);
  });

  afterEach(() => {
    localStorage.removeItem('folio-investment-plan');
    localStorage.removeItem('folio-monthly-arrears');
  });

  it('copies a selected month plan including actuals into the blank month', () => {
    const sourceItem = store.monthPlans()['January'][0].items[0];
    sourceItem.actuals = { January: 500 };
    store.setActiveMonth('February');

    expect(store.categories()).toEqual([]);

    store.copyPlanFromMonth('January', 'February');

    expect(store.categories()).toEqual([
      {
        name: 'Investments',
        color: 'mint',
        items: [
          {
            name: 'Index fund',
            amount: 1500,
            actuals: { February: 500 },
          },
        ],
      },
    ]);
    expect(store.categories()[0].items[0]).not.toBe(
      sourceItem,
    );
    expect(sourceItem.actuals).toEqual({ January: 500 });
  });

  it('copies opening balance, salary, and other income from the selected month', () => {
    store.setActiveMonth('February');
    store.setArrears('January', 1200);
    store.setSalary('January', 50000);
    store.setOtherIncome('January', 800);
    store.setArrears('February', 300);
    store.setSalary('February', 1000);
    store.setOtherIncome('February', 100);

    store.copyPlanFromMonth('January', 'February');

    expect(store.arrearsFor('February')).toBe(1200);
    expect(store.salaryFor('February')).toBe(50000);
    expect(store.otherIncomeFor('February')).toBe(800);
  });

  it('includes arrears in income balances and persists the monthly amount', () => {
    store.setActiveMonth('February');
    store.setArrears('February', 2000);

    expect(store.totalIncomeFor('February')).toBe(2000);
    expect(store.availableBalanceFor('February')).toBe(500);
    expect(JSON.parse(localStorage.getItem('folio-monthly-arrears')!)).toEqual({
      February: 2000,
    });
  });

  it('limits manually entered amounts to seven digits', () => {
    store.setArrears('February', 12345678);
    store.setSalary('February', '12345678');

    expect(store.arrearsFor('February')).toBe(9999999);
    expect(store.salaryFor('February')).toBe(9999999);
  });
});