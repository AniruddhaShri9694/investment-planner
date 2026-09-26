import { Component, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PlannerStore } from '../../planner-store.service';

@Component({
  selector: 'app-month-plan',
  imports: [FormsModule, NgClass, RouterLink],
  templateUrl: './month-plan.html',
})
export class MonthPlan {
  protected readonly store = inject(PlannerStore);
  protected readonly month =
    inject(ActivatedRoute).snapshot.paramMap.get('month') ??
    this.store.currentMonth;
  protected readonly editing = signal(false);

  protected startEditing(): void {
    this.editing.set(true);
  }
  protected finishEditing(): void {
    this.store.refresh();
    this.editing.set(false);
  }
}
