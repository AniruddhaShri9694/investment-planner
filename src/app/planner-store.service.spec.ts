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

  afterEach(() => localStorage.removeItem('folio-investment-plan'));

  it('copies January into a blank February without sharing item objects', () => {
    store.setActiveMonth('February');

    expect(store.categories()).toEqual([
      {
        name: 'Investments',
        color: 'mint',
        items: [{ name: 'Index fund', amount: 1500, actuals: {} }],
      },
    ]);
    expect(store.categories()[0].items[0]).not.toBe(
      store.monthPlans()['January'][0].items[0],
    );
  });
});