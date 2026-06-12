import { Injectable } from '@angular/core';
import { WorkflowDefinition } from './workflow.service';

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private readonly MAX_HISTORY = 50;

  private past: WorkflowDefinition[] = [];
  private future: WorkflowDefinition[] = [];

  /** Llama ANTES de mutar el workflow. Clona el estado actual. */
  push(currentState: WorkflowDefinition): void {
    const snapshot = JSON.parse(JSON.stringify(currentState)) as WorkflowDefinition;
    this.past.push(snapshot);
    if (this.past.length > this.MAX_HISTORY) {
      this.past.shift();
    }
    // Cualquier nueva acción invalida el future
    this.future = [];
  }

  /** Deshace la última acción. Devuelve el estado anterior o null si no hay. */
  undo(currentState: WorkflowDefinition): WorkflowDefinition | null {
    if (!this.past.length) return null;
    const previous = this.past.pop()!;
    const snapshot = JSON.parse(JSON.stringify(currentState)) as WorkflowDefinition;
    this.future.push(snapshot);
    return previous;
  }

  /** Rehace la última acción deshecha. */
  redo(currentState: WorkflowDefinition): WorkflowDefinition | null {
    if (!this.future.length) return null;
    const next = this.future.pop()!;
    const snapshot = JSON.parse(JSON.stringify(currentState)) as WorkflowDefinition;
    this.past.push(snapshot);
    return next;
  }

  canUndo(): boolean { return this.past.length > 0; }
  canRedo(): boolean { return this.future.length > 0; }

  clear(): void {
    this.past = [];
    this.future = [];
  }
}
