import { Component, computed, inject, signal } from '@angular/core';
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
  protected readonly copyFromMonth = signal('');
  protected readonly copyableMonths = computed(() =>
    this.store.months.filter(
      (entry) =>
        entry.name !== this.month && this.store.hasPlanItems(entry.name),
    ),
  );

  constructor() {
    this.store.setActiveMonth(this.month);
  }

  protected selectedSourceMonth(): string {
    const selected = this.copyFromMonth();
    return this.copyableMonths().some((entry) => entry.name === selected)
      ? selected
      : (this.copyableMonths()[0]?.name ?? '');
  }

  protected copySelectedMonth(): void {
    const sourceMonth = this.selectedSourceMonth();
    if (sourceMonth) this.store.copyPlanFromMonth(sourceMonth, this.month);
  }

  protected startEditing(): void {
    this.editing.set(true);
  }
  protected finishEditing(): void {
    this.store.refresh();
    this.editing.set(false);
  }

  protected limitAmountInput(event: InputEvent): void {
    if (event.inputType.startsWith('delete')) return;

    const input = event.target as HTMLInputElement;
    const inserted = event.data ?? event.dataTransfer?.getData('text/plain');
    if (inserted === null || inserted === undefined) return;

    if (!this.canInsertAmount(input, inserted)) event.preventDefault();
  }

  protected limitAmountPaste(event: ClipboardEvent): void {
    const input = event.target as HTMLInputElement;
    const inserted = event.clipboardData?.getData('text/plain') ?? '';
    if (!this.canInsertAmount(input, inserted)) event.preventDefault();
  }

  private canInsertAmount(input: HTMLInputElement, inserted: string): boolean {
    if (!/^[\d.]*$/.test(inserted)) return false;

    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    const candidate =
      input.value.slice(0, start) + inserted + input.value.slice(end);

    return (
      (candidate.match(/\d/g)?.length ?? 0) <= 7 &&
      (candidate.match(/\./g)?.length ?? 0) <= 1
    );
  }
}
