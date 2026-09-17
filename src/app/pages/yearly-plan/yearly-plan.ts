import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PlannerStore } from '../../planner-store.service';

@Component({
  selector: 'app-yearly-plan',
  imports: [RouterLink],
  templateUrl: './yearly-plan.html',
})
export class YearlyPlan {
  protected readonly store = inject(PlannerStore);
}
