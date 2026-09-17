import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PlannerStore } from '../../planner-store.service';

@Component({
  selector: 'app-dashboard',
  imports: [FormsModule, RouterLink],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  protected readonly store = inject(PlannerStore);
}
