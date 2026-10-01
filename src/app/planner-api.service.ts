import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './api-config';
import { AuthService } from './auth.service';

export interface PlannerPayload {
  id?: string;
  monthPlans: Record<
    string,
    {
      categories: Array<{
        name: string;
        items: Array<{
          name: string;
          amount: number;
          actuals: Record<string, number>;
        }>;
      }>;
    }
  >;
  salaries: Record<string, number>;
  otherIncomes: Record<string, number>;
  lastUpdatedUtc?: string;
}

@Injectable({ providedIn: 'root' })
export class PlannerApiService {
  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService,
  ) {}

  getPlanner(): Promise<PlannerPayload> {
    return firstValueFrom(
      this.http.get<PlannerPayload>(`${API_BASE_URL}/planner`, {
        headers: this.headers(),
      }),
    );
  }

  createPlanner(planner: PlannerPayload): Promise<PlannerPayload> {
    return firstValueFrom(
      this.http.post<PlannerPayload>(`${API_BASE_URL}/planner`, planner, {
        headers: this.headers(),
      }),
    );
  }

  updatePlanner(planner: PlannerPayload): Promise<PlannerPayload> {
    return firstValueFrom(
      this.http.put<PlannerPayload>(`${API_BASE_URL}/planner`, planner, {
        headers: this.headers(),
      }),
    );
  }

  private headers(): HttpHeaders {
    const token = this.auth.token();
    return token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();
  }
}